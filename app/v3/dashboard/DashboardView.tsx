'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  sender_role: 'user' | 'assistant';
  body: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface Conversation {
  id: string;
  session_id: string;
  user_id?: string | null;
  user_email?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  metadata?: Record<string, unknown> | null;
  messages: Message[];
}

interface DashboardViewProps {
  conversations: Conversation[];
  fetchedAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('hu-HU', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string) {
  return id.slice(0, 8) + '…';
}

export function DashboardView({ conversations, fetchedAt }: DashboardViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = conversations.filter(c =>
    !search || (c.user_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/60">Admin · V3</p>
            <h1 className="mt-1 text-2xl text-neutral-100">Conversations</h1>
            <p className="mt-0.5 text-xs text-neutral-600">Lekérve: {formatDate(fetchedAt)}</p>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-200"
          >
            Frissítés
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szűrés email alapján…"
          className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-lime-400/40"
        />

        {/* Stats */}
        <div className="mb-6 flex gap-4 text-xs text-neutral-500">
          <span><span className="font-medium text-neutral-300">{conversations.length}</span> conversation</span>
          <span><span className="font-medium text-neutral-300">{conversations.reduce((s, c) => s + c.messages.length, 0)}</span> üzenet összesen</span>
        </div>

        {/* Conversations list */}
        <div className="flex flex-col gap-3">
          {filtered.map(conv => {
            const isOpen = expandedId === conv.id;
            const msgCount = conv.messages.length;
            return (
              <div key={conv.id} className="rounded-xl border border-white/8 bg-white/[0.025]">
                {/* Conversation header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : conv.id)}
                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-200">
                      {conv.user_email ?? <span className="text-neutral-600">ismeretlen</span>}
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      session: {shortId(conv.session_id)} · {msgCount} üzenet
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <p className="text-[11px] text-neutral-500">{formatDate(conv.last_message_at)}</p>
                    <span className="text-[10px] text-neutral-700">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/6 px-4 py-3">
                    {/* Conversation metadata */}
                    {conv.metadata && Object.keys(conv.metadata).length > 0 && (
                      <details className="mb-4">
                        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-400">
                          Conversation metadata
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-5 text-neutral-400">
                          {JSON.stringify(conv.metadata, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* Messages */}
                    <div className="flex flex-col gap-3">
                      {conv.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`rounded-lg border px-3 py-2.5 text-xs ${
                            msg.sender_role === 'user'
                              ? 'border-white/6 bg-white/[0.02]'
                              : 'border-lime-400/10 bg-lime-400/[0.03]'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className={`font-medium ${msg.sender_role === 'user' ? 'text-neutral-400' : 'text-lime-300/80'}`}>
                              {msg.sender_role === 'user' ? 'USER' : 'V'}
                            </span>
                            {msg.model && (
                              <span className="text-[10px] text-neutral-600">{msg.model}</span>
                            )}
                            {msg.safety_flag && (
                              <span className="rounded bg-red-500/20 px-1 text-[10px] text-red-400">safety</span>
                            )}
                            <span className="ml-auto text-[10px] text-neutral-700">{formatDate(msg.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-5 text-neutral-300">{msg.body}</p>
                          {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[10px] text-neutral-700 hover:text-neutral-500">
                                metadata
                              </summary>
                              <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-[10px] leading-4 text-neutral-500">
                                {JSON.stringify(msg.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-600">Nincs találat.</p>
          )}
        </div>
      </div>
    </div>
  );
}
