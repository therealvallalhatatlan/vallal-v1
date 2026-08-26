'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Role } from '@/lib/live/auth';
import { clearUnreadSource, setUnreadSource } from '@/lib/notifications/unreadStore';

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
  unreadSourceKey?: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  display_name: string;
  sender_role: Role;
  body: string;
  created_at: string;
};

type ReplyTarget = Pick<ChatMessage, 'id' | 'display_name' | 'body'>;

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
  unreadSourceKey,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const resolvedTitle = useMemo(
    () => title || (compact ? 'Live chat' : 'Live feed'),
    [compact, title]
  );

  const globalUnreadSourceKey = useMemo(
    () => unreadSourceKey || `live-chat:${roomId}`,
    [roomId, unreadSourceKey]
  );

  const replyPrefix = useMemo(
    () => (replyTo ? `@${replyTo.display_name} ` : ''),
    [replyTo]
  );

  const maxInputLength = Math.max(
    0,
    MAX_MESSAGE_LENGTH - replyPrefix.length
  );

  const getReplyPreview = (body: string) => {
    const collapsed = body.replace(/\s+/g, ' ').trim();
    if (collapsed.length <= 60) return collapsed;
    return `${collapsed.slice(0, 57)}...`;
  };

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  useEffect(() => {
    setUnreadSource(globalUnreadSourceKey, unread);
  }, [globalUnreadSourceKey, unread]);

  useEffect(() => {
    return () => {
      clearUnreadSource(globalUnreadSourceKey);
    };
  }, [globalUnreadSourceKey]);

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

      if (!silent) {
        setLoading(true);
      }

      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const res = await fetch(
          `/api/live-chat?room_id=${encodeURIComponent(roomId)}&limit=100`,
          { headers }
        );

        const json = await res.json().catch(() => null);

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          if (
            json?.error === 'auth_required' ||
            json?.error === 'unauthenticated'
          ) {
            setError(
              'Bejelentkezes szukseges a beszelgetes betoltesehez.'
            );
          } else {
            setError('Nem sikerult betolteni a chatet.');
          }
          return;
        }

        setError(null);

        const nextMessages: ChatMessage[] = Array.isArray(json.messages)
          ? json.messages
          : [];

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
          setIsInitialLoad(false);
        }
      }
    };

    void loadInitial(false);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    if (enableRealtime) {
      console.log('[LIVE CHAT REALTIME] SUBSCRIBING room=' + roomId);
      channel = supabase
        .channel(`live-chat:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            if (!payload?.new) return;

            const incoming = payload.new as ChatMessage;
            if (incoming.room_id !== roomId) return;

            const knownIds = knownMessageIdsRef.current;

            if (knownIds.has(incoming.id)) return;

            knownIds.add(incoming.id);

            setMessages((current) => {
              if (current.some((message) => message.id === incoming.id)) {
                return current;
              }
              return [...current, incoming];
            });

            if (!active) {
              setUnread((count) => count + 1);
            }
          }
        )
        .subscribe();
      console.log('[LIVE CHAT REALTIME] SUBSCRIBED room=' + roomId);
    }

    if (!enableRealtime && pollIntervalMs > 0) {
      pollTimer = setInterval(() => {
        void loadInitial(true);
      }, pollIntervalMs);
    }

    return () => {
      mounted = false;

      if (channel) {
        void channel.unsubscribe();
      }

      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [
    roomId,
    authToken,
    enableRealtime,
    pollIntervalMs,
    requireAuth,
    active,
  ]);

  const sendMessage = async () => {
    if (sending) return;

    const rawInput = input.trim();
    if (!rawInput) return;

    if (requireAuth && !authToken) {
      setError('Uzenetkuldeshez be kell jelentkezned.');
      return;
    }

    const body = `${replyPrefix}${rawInput}`.trim();

    if (body.length > MAX_MESSAGE_LENGTH) {
      setError(`Az uzenet legfeljebb ${MAX_MESSAGE_LENGTH} karakter lehet.`);
      return;
    }

    setSending(true);
    setError(null);

    const requestId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const payload = {
      room_id: roomId,
      display_name: displayName,
      sender_role: role,
      body,
    };

    console.log('[LIVE CHAT SEND REQUEST]', {
      requestId,
      roomId,
      payload,
    });

    const startedAt = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      console.log('[LIVE CHAT SEND FETCH START]', { requestId });

      const res = await fetch('/api/live-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      console.log('[LIVE CHAT SEND FETCH END]', {
        requestId,
        status: res.status,
        ok: res.ok,
        durationMs: Math.round(performance.now() - startedAt),
      });

      const json = await res.json().catch(() => null);

      console.log('[LIVE CHAT SEND RESPONSE]', {
        requestId,
        status: res.status,
        body: json,
        durationMs: Math.round(performance.now() - startedAt),
      });

      if (!res.ok || !json?.ok) {
        console.log('[LIVE CHAT SEND] FAILURE]', { requestId, status: res.status, body: json });
        setError(
          typeof json?.message === 'string'
            ? json.message
            : typeof json?.error === 'string'
              ? json.error
              : 'Nem sikerult elkuldeni az uzenetet.'
        );
        return;
      }

      const sentMessage = json.message as ChatMessage | undefined;

      if (sentMessage?.id) {
        knownMessageIdsRef.current.add(sentMessage.id);

        setMessages((current) => {
          if (current.some((message) => message.id === sentMessage.id)) {
            return current;
          }
          return [...current, sentMessage];
        });
      }

      console.log('[LIVE CHAT SEND] SUCCESS]', { requestId, messageId: sentMessage?.id });
      setInput('');
      setReplyTo(null);
      setUnread(0);
      setError(null);
    } catch (sendError) {
      console.error('[LIVE CHAT SEND EXCEPTION]', {
        requestId,
        error: sendError,
        durationMs: Math.round(performance.now() - startedAt),
      });

      setError('Nem sikerult elkuldeni az uzenetet.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col border border-white/10 bg-[#050607]">
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold tracking-[0.12em] text-zinc-100">
            {resolvedTitle}
          </h3>
          <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
            {messages.length} uzenet
          </span>
        </div>
      ) : null}

      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {isInitialLoad && loading ? (
          <div className="text-sm text-zinc-500">Betoltes...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Meg nincs uzenet. Legyel te az elso.
          </div>
        ) : (
          messages.map((message) => {
            const ownMessage = selfRole
              ? message.sender_role === selfRole
              : message.display_name.toLowerCase() ===
                  displayName.toLowerCase() && message.sender_role === role;

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
                      if (
                        message.display_name.toLowerCase() !==
                          displayName.toLowerCase() &&
                        onUserNameClick
                      ) {
                        onUserNameClick(message.display_name);
                      }
                    }}
                    style={{
                      cursor:
                        message.display_name.toLowerCase() ===
                        displayName.toLowerCase()
                          ? 'default'
                          : 'pointer',
                      color:
                        message.display_name.toLowerCase() ===
                        displayName.toLowerCase()
                          ? 'inherit'
                          : '#94a3b8',
                      textDecoration:
                        message.display_name.toLowerCase() ===
                        displayName.toLowerCase()
                          ? 'none'
                          : 'underline',
                      textDecorationColor:
                        message.display_name.toLowerCase() ===
                        displayName.toLowerCase()
                          ? 'transparent'
                          : 'rgba(148,163,184,0.5)',
                      textUnderlineOffset: 2,
                    }}
                    className={
                      message.display_name.toLowerCase() ===
                      displayName.toLowerCase()
                        ? ''
                        : 'hover:text-zinc-100'
                    }
                  >
                    {message.display_name}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo({
                          id: message.id,
                          display_name: message.display_name,
                          body: message.body,
                        });
                        textareaRef.current?.focus();
                      }}
                      className="border border-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-300 hover:border-[#c8a97e]/45 hover:text-[#f3e9d8]"
                    >
                      Valasz
                    </button>

                    <span>
                      {new Date(message.created_at).toLocaleTimeString(
                        'hu-HU',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  </div>
                </div>

                <p className="mt-1 whitespace-pre-wrap break-words text-zinc-100">
                  {message.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2 border-t border-white/10 px-3 py-3">
        {onUserNameClick ? (
          <div className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">
            Tipp: koppints egy nevre privat uzenethez.
          </div>
        ) : null}

        {replyTo ? (
          <div className="flex items-start justify-between gap-2 border border-[#c8a97e]/30 bg-[#c8a97e]/10 px-2 py-1.5 text-xs text-[#f3e9d8]">
            <div className="min-w-0">
              <div className="uppercase tracking-[0.08em] text-[#d7c2a3]">
                Valasz: {replyTo.display_name}
              </div>
              <div className="truncate text-zinc-200">
                "{getReplyPreview(replyTo.body)}"
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-300 hover:text-zinc-100"
            >
              Megse
            </button>
          </div>
        ) : null}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={placeholder}
          maxLength={maxInputLength}
          rows={2}
          disabled={sending || (requireAuth && !authToken)}
          className="w-full resize-none border border-white/12 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#c8a97e]"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {(replyPrefix + input).trim().length}/{MAX_MESSAGE_LENGTH}
          </span>

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={
              sending ||
              !input.trim() ||
              (requireAuth && !authToken)
            }
            className="border border-[#c8a97e]/45 bg-[#c8a97e]/14 px-3 py-1.5 text-sm font-semibold text-[#f3e9d8] disabled:opacity-40"
          >
            {sending ? 'Kuldes...' : 'Kuld'}
          </button>
        </div>

        {requireAuth && !authToken ? (
          <div className="text-xs text-[#d7c2a3]">
            Uzenetkuldeshez be kell jelentkezned.
          </div>
        ) : null}

        {error ? (
          <div className="text-xs text-rose-400">{error}</div>
        ) : null}
      </div>
    </div>
  );
}