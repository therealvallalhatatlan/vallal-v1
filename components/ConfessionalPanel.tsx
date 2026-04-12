"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  MAX_GYONTATAS_MESSAGE_LENGTH,
  type GyontatasHistoryResponse,
  type GyontatasMessage,
} from '@/lib/gyontatoszek/types';

const SESSION_STORAGE_KEY = 'gyontatoszek-session-id';

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createOptimisticMessage(id: string, sender_role: 'user' | 'assistant', body: string): GyontatasMessage {
  return {
    id,
    conversation_id: 'optimistic',
    sender_role,
    body,
    model: null,
    safety_flag: false,
    metadata: { optimistic: true },
    created_at: new Date().toISOString(),
  };
}

export default function ConfessionalPanel() {
  const [confession, setConfession] = useState('');
  const [messages, setMessages] = useState<GyontatasMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  async function loadHistory(currentSessionId: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/gyontatoszek?session_id=${encodeURIComponent(currentSessionId)}`);
      if (!res.ok) {
        throw new Error('Nem sikerult betolteni az elozmenyeket.');
      }
      const data = (await res.json()) as GyontatasHistoryResponse;
      setMessages(data.messages || []);
    } catch {
      setError('Nem sikerult visszatolteni a beszelgetest.');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    let storedSessionId = '';

    try {
      storedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY) || '';
      if (!storedSessionId) {
        storedSessionId = generateSessionId();
        window.localStorage.setItem(SESSION_STORAGE_KEY, storedSessionId);
      }
    } catch {
      storedSessionId = generateSessionId();
    }

    setSessionId(storedSessionId);
    loadHistory(storedSessionId);
  }, []);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, loadingHistory]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = confession.trim();
    if (!trimmed || !sessionId || sending) {
      return;
    }

    if (trimmed.length > MAX_GYONTATAS_MESSAGE_LENGTH) {
      setError(`A gyonas legfeljebb ${MAX_GYONTATAS_MESSAGE_LENGTH} karakter lehet.`);
      return;
    }

    const optimisticUserId = `user-${Date.now()}`;
    const optimisticAssistantId = `assistant-${Date.now()}`;

    setError(null);
    setSending(true);
    setConfession('');
    setMessages((prev) => [
      ...prev,
      createOptimisticMessage(optimisticUserId, 'user', trimmed),
      createOptimisticMessage(optimisticAssistantId, 'assistant', ''),
    ]);

    try {
      const res = await fetch('/api/gyontatoszek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confession: trimmed, session_id: sessionId }),
      });

      if (!res.ok) {
        throw new Error('A nyul most nem valaszol.');
      }

      if (!res.body) {
        throw new Error('Nem erkezett stream valasz.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === optimisticAssistantId ? { ...message, body: assistantText } : message
          )
        );
      }

      await loadHistory(sessionId);
    } catch {
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId)
      );
      setConfession(trimmed);
      setError('Hiba tortent. Probald ujra.');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full max-w-4xl px-4 py-6 md:px-6"
    >
      <div className="flex h-[min(84vh,860px)] flex-col overflow-hidden rounded-[28px] border border-neutral-800 bg-black/65 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="border-b border-neutral-800 px-5 py-5 md:px-7">
          <h1 className="text-2xl font-bold tracking-[0.22em] text-neutral-100 md:text-3xl glitch-text">
            Gyond meg a nyulnak.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
            Itt mar nem egyetlen valasz jon. A kerdesek es a feleletek egymas alatt maradnak,
            hogy a nyul emlekezzen arra is, amit mar kimondtal.
          </p>
        </div>

        <div ref={threadRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-5">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.2em] text-neutral-500">
              Epitjuk vissza a beszelgetest...
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <p className="text-sm uppercase tracking-[0.28em] text-neutral-500">Ures fulke</p>
              <p className="mt-3 text-lg leading-relaxed text-neutral-300 md:text-xl">
                Kezdd el. A nyul nem kerdez vissza udvariassagbol, csak akkor, ha mar tenyleg van mit kapirgalni.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => {
                const isUser = message.sender_role === 'user';

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-3xl border px-4 py-3 md:px-5 md:py-4 ${
                        isUser
                          ? 'border-lime-400/30 bg-lime-400/10 text-lime-50'
                          : 'border-neutral-800 bg-neutral-950/80 text-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                        <span>{isUser ? 'Te' : 'Nyul'}</span>
                        <span>{new Date(message.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed md:text-[15px]">
                        {message.body || (sending && !isUser ? '...' : '')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 bg-black/50 px-4 py-4 md:px-6">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-3">
            <textarea
              className="min-h-[120px] w-full resize-none rounded-3xl border border-neutral-700 bg-black/80 px-4 py-4 font-mono text-base text-neutral-100 outline-none transition focus:border-lime-400/60"
              placeholder="Ird le, mit cipelsz. Enter kuld, Shift+Enter uj sor."
              value={confession}
              onChange={(e) => setConfession(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              maxLength={MAX_GYONTATAS_MESSAGE_LENGTH}
              disabled={sending || loadingHistory}
            />
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {confession.length}/{MAX_GYONTATAS_MESSAGE_LENGTH}
              </div>
              <button
                type="submit"
                disabled={sending || loadingHistory || !confession.trim()}
                className="rounded-full bg-lime-400 px-5 py-3 text-sm font-bold uppercase tracking-[0.22em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? 'Kuldjuk...' : 'Mehet a nyulnak'}
              </button>
            </div>
            {error ? <div className="text-sm text-rose-400">{error}</div> : null}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
