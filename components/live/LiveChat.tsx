'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Role } from '@/lib/live/auth';

type Props = {
  displayName: string;
  role: Role;
  roomId?: string;
  compact?: boolean;
  title?: string;
  placeholder?: string;
  hideHeader?: boolean;
  onUnreadChange?: (count: number) => void;
  active?: boolean;
  authToken?: string | null;
  requireAuth?: boolean;
  enableRealtime?: boolean;
  pollIntervalMs?: number;
  selfRole?: Role;
};

type ChatMessage = {
  id: string;
  room_id: string;
  display_name: string;
  sender_role: Role;
  body: string;
  created_at: string;
};

const MAX_MESSAGE_LENGTH = 200;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChat({
  displayName,
  role,
  roomId = 'nyitott-muhely',
  compact = false,
  title,
  placeholder = 'Irj egy rovid uzenetet...',
  hideHeader = false,
  onUnreadChange,
  active = true,
  authToken = null,
  requireAuth = false,
  enableRealtime = true,
  pollIntervalMs = 2500,
  selfRole,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const resolvedTitle = useMemo(() => title || (compact ? 'Live chat' : 'Live feed'), [compact, title]);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/live-chat?room_id=${encodeURIComponent(roomId)}&limit=100`);
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok || !json.ok) {
          setError('Nem sikerult betolteni a chatet.');
          return;
        }
        setMessages(json.messages || []);
      } catch {
        if (mounted) {
          setError('Nem sikerult betolteni a chatet.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitial();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (enableRealtime) {
      channel = supabase
        .channel(`public:live_chat_messages:${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const incoming = payload.new as ChatMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) {
                return prev;
              }
              return [...prev, incoming];
            });

            if (!active) {
              setUnread((count) => count + 1);
            }
          }
        )
        .subscribe();
    } else if (pollIntervalMs > 0) {
      pollTimer = setInterval(() => {
        void loadInitial();
      }, pollIntervalMs);
    }

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [roomId, active, enableRealtime, pollIntervalMs]);

  useEffect(() => {
    if (active) {
      setUnread(0);
    }
  }, [active]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const body = input.trim();
    if (!body || sending) return;
    if (requireAuth && !authToken) {
      setError('Bejelentkezes szukseges az uzenetkuldeshez.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/live-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          room_id: roomId,
          display_name: displayName,
          sender_role: role,
          body,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json?.error === 'rate_limited') {
          setError('Tul gyorsan kuldesz. Varj egy kicsit.');
        } else if (json?.error === 'auth_required' || json?.error === 'unauthenticated') {
          setError('Bejelentkezes szukseges az uzenetkuldeshez.');
        } else if (json?.error === 'nickname_required') {
          setError('Elobb valassz felhasznalonevet.');
        } else {
          setError('Nem sikerult elkuldeni az uzenetet.');
        }
        return;
      }
      setInput('');
    } catch {
      setError('Nem sikerult elkuldeni az uzenetet.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full flex flex-col rounded-xl border border-gray-800 bg-black/50">
      {!hideHeader ? (
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold tracking-wide">{resolvedTitle}</h3>
          <span className="text-xs text-gray-400">{messages.length} uzenet</span>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="text-sm text-gray-500">Betoltes...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">Meg nincs uzenet. Legyel te az elso.</div>
        ) : (
          messages.map((message) => {
            const ownMessage = selfRole
              ? message.sender_role === selfRole
              : message.display_name.toLowerCase() === displayName.toLowerCase() &&
                message.sender_role === role;

            return (
              <div
                key={message.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  ownMessage
                    ? 'bg-lime-500/15 border border-lime-500/30'
                    : message.sender_role === 'broadcaster'
                    ? 'bg-fuchsia-500/15 border border-fuchsia-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                  <span>{message.display_name}</span>
                  <span>{new Date(message.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-gray-100">{message.body}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-800 px-3 py-3 space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={placeholder}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          disabled={sending || (requireAuth && !authToken)}
          className="w-full resize-none rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-lime-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{input.length}/{MAX_MESSAGE_LENGTH}</span>
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim() || (requireAuth && !authToken)}
            className="rounded-md bg-lime-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            {sending ? 'Kuldes...' : 'Kuld'}
          </button>
        </div>
        {requireAuth && !authToken ? <div className="text-xs text-amber-300">Uzenetkuldeshez be kell jelentkezned.</div> : null}
        {error ? <div className="text-xs text-rose-400">{error}</div> : null}
      </div>
    </div>
  );
}