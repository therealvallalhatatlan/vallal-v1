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
  onUserNameClick?: (username: string) => void;
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
  onUserNameClick,
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const resolvedTitle = useMemo(() => title || (compact ? 'Live chat' : 'Live feed'), [compact, title]);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  useEffect(() => {
    let mounted = true;
    knownMessageIdsRef.current = new Set();

    const loadInitial = async (silent = false) => {
      if (requireAuth && !authToken) {
        if (mounted) {
          setMessages([]);
          setError('Bejelentkezes szukseges a beszelgetes betoltesehez.');
          if (!silent) setLoading(false);
          setIsInitialLoad(false);
        }
        return;
      }

      // Only show loading indicator on initial load, not during polling
      if (!silent) {
        setLoading(true);
      }

      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const res = await fetch(`/api/live-chat?room_id=${encodeURIComponent(roomId)}&limit=100`, {
          headers,
        });
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok || !json.ok) {
          if (json?.error === 'auth_required' || json?.error === 'unauthenticated') {
            setError('Bejelentkezes szukseges a beszelgetes betoltesehez.');
          } else {
            setError('Nem sikerult betolteni a chatet.');
          }
          return;
        }
        setError(null);
        const nextMessages: ChatMessage[] = json.messages || [];
        const nextIds = new Set(nextMessages.map((message) => message.id));
        const knownIds = knownMessageIdsRef.current;

        if (!active && knownIds.size > 0) {
          let incomingCount = 0;
          for (const message of nextMessages) {
            if (!knownIds.has(message.id)) {
              incomingCount += 1;
            }
          }
          if (incomingCount > 0) {
            setUnread((count) => count + incomingCount);
          }
        }

        knownMessageIdsRef.current = nextIds;
        setMessages(nextMessages);
      } catch {
        if (mounted) {
          setError('Nem sikerult betolteni a chatet.');
        }
      } finally {
        if (mounted) {
          if (!silent) setLoading(false);
          if (isInitialLoad) setIsInitialLoad(false);
        }
      }
    };

    loadInitial(false); // Initial load is not silent

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
        void loadInitial(true); // Polling refreshes are silent
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
  }, [roomId, active, enableRealtime, pollIntervalMs, authToken, requireAuth]);

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
    <div className="flex h-full flex-col border border-white/10 bg-[#050607]">
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold tracking-[0.12em] text-zinc-100">{resolvedTitle}</h3>
          <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">{messages.length} uzenet</span>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {isInitialLoad && loading ? (
          <div className="text-sm text-zinc-500">Betoltes...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-zinc-500">Meg nincs uzenet. Legyel te az elso.</div>
        ) : (
          messages.map((message) => {
            const ownMessage = selfRole
              ? message.sender_role === selfRole
              : message.display_name.toLowerCase() === displayName.toLowerCase() &&
                message.sender_role === role;

            return (
              <div
                key={message.id}
                className={`border px-3 py-2 text-sm ${
                  ownMessage
                    ? 'border-[#c8a97e]/35 bg-[#c8a97e]/12'
                    : message.sender_role === 'broadcaster'
                    ? 'border-[#c8a97e]/30 bg-white/[0.05]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  <span
                    onClick={() => {
                      if (message.display_name.toLowerCase() !== displayName.toLowerCase() && onUserNameClick) {
                        onUserNameClick(message.display_name)
                      }
                    }}
                    style={{
                      cursor: message.display_name.toLowerCase() === displayName.toLowerCase() ? 'default' : 'pointer',
                      color: message.display_name.toLowerCase() === displayName.toLowerCase() ? 'inherit' : '#94a3b8',
                      textDecoration:
                        message.display_name.toLowerCase() === displayName.toLowerCase() ? 'none' : 'underline',
                      textDecorationColor:
                        message.display_name.toLowerCase() === displayName.toLowerCase() ? 'transparent' : 'rgba(148,163,184,0.5)',
                      textUnderlineOffset: 2,
                    }}
                    className={message.display_name.toLowerCase() === displayName.toLowerCase() ? '' : 'hover:text-zinc-100'}
                  >
                    {message.display_name}
                  </span>
                  <span>{new Date(message.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-zinc-100">{message.body}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2 border-t border-white/10 px-3 py-3">
        {onUserNameClick ? (
          <div className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Tipp: koppints egy nevre privat uzenethez.</div>
        ) : null}
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
          className="w-full resize-none border border-white/12 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#c8a97e]"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{input.length}/{MAX_MESSAGE_LENGTH}</span>
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim() || (requireAuth && !authToken)}
            className="border border-[#c8a97e]/45 bg-[#c8a97e]/14 px-3 py-1.5 text-sm font-semibold text-[#f3e9d8] disabled:opacity-40"
          >
            {sending ? 'Kuldes...' : 'Kuld'}
          </button>
        </div>
        {requireAuth && !authToken ? <div className="text-xs text-[#d7c2a3]">Uzenetkuldeshez be kell jelentkezned.</div> : null}
        {error ? <div className="text-xs text-rose-400">{error}</div> : null}
      </div>
    </div>
  );
}