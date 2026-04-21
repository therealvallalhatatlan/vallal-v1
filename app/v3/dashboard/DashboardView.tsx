'use client';

import { useEffect, useRef, useState } from 'react';
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

interface RelationshipMemory {
  familiarity?: number;
  trust?: number;
  irritation?: number;
  repetition?: number;
  emotional_tone?: 'neutral' | 'warm' | 'volatile' | 'vulnerable' | 'guarded';
  recurring_topics?: string[];
  last_trigger?: string | null;
  state_name?: string | null;
  state_intensity?: number | null;
}

interface DashboardViewProps {
  conversations: Conversation[];
  fetchedAt: string;
  stats: { totalConversations: number; totalMessages: number; safetyFlagCount: number; uniqueEmails: number };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('hu-HU', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'most';
  if (mins < 60) return `${mins}p`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ó`;
  return `${Math.floor(hrs / 24)}n`;
}

function shortId(id: string) {
  return id.slice(0, 8) + '…';
}

function getRelationshipMemory(conv: Conversation): RelationshipMemory | null {
  const meta = conv.metadata;
  if (!meta) return null;
  const rm = (meta.relationshipMemory ?? meta.relationship_memory ?? meta) as Record<string, unknown>;
  if (typeof rm?.trust === 'number' || typeof rm?.familiarity === 'number') {
    return rm as RelationshipMemory;
  }
  return null;
}

function getMessageStrategy(msg: Message): { primary: string | null; secondary: string | null; shadowText: string | null } {
  const m = msg.metadata as Record<string, unknown> | null;
  if (!m) return { primary: null, secondary: null, shadowText: null };
  return {
    primary: (m.strategy as string) ?? null,
    secondary: (m.secondaryStrategy as string) ?? null,
    shadowText: (m.shadowText as string) ?? null,
  };
}

const TONE_STYLES: Record<string, string> = {
  neutral: 'border-neutral-600/40 bg-neutral-600/10 text-neutral-400',
  warm: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  volatile: 'border-red-400/40 bg-red-400/10 text-red-300',
  vulnerable: 'border-purple-400/40 bg-purple-400/10 text-purple-300',
  guarded: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
};

const STRATEGY_STYLES: Record<string, string> = {
  deflect: 'bg-neutral-800 text-neutral-400',
  distort: 'bg-purple-900/40 text-purple-300',
  challenge: 'bg-orange-900/40 text-orange-300',
  tease: 'bg-yellow-900/40 text-yellow-300',
  mirror: 'bg-blue-900/40 text-blue-300',
  reveal: 'bg-lime-900/40 text-lime-300',
  compress: 'bg-neutral-800 text-neutral-500',
  expand: 'bg-teal-900/40 text-teal-300',
  'soft-refuse': 'bg-red-900/30 text-red-400',
  contradict: 'bg-rose-900/40 text-rose-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCards({ stats }: { stats: DashboardViewProps['stats'] }) {
  const cards = [
    { label: 'Conversations', value: stats.totalConversations },
    { label: 'Üzenetek', value: stats.totalMessages },
    { label: 'Safety flagek', value: stats.safetyFlagCount, danger: stats.safetyFlagCount > 0 },
    { label: 'Egyedi userek', value: stats.uniqueEmails },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-lg border border-white/8 bg-white/[0.025] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">{c.label}</p>
          <p className={`mt-1 text-2xl font-light tabular-nums ${c.danger ? 'text-red-400' : 'text-neutral-100'}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function MemoryBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-right text-[10px] uppercase tracking-[0.15em] text-neutral-600">{label}</span>
      <div className="relative h-1 flex-1 rounded-full bg-white/6">
        <div
          className={`absolute left-0 top-0 h-1 rounded-full ${colorClass}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] text-neutral-600 tabular-nums">{pct.toFixed(2)}</span>
    </div>
  );
}

function RelationshipPanel({ memory }: { memory: RelationshipMemory }) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3">
      <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-neutral-600">Relationship Memory</p>
      <div className="flex flex-col gap-2">
        {typeof memory.trust === 'number' && (
          <MemoryBar label="trust" value={memory.trust} colorClass="bg-lime-400" />
        )}
        {typeof memory.irritation === 'number' && (
          <MemoryBar label="irrit." value={memory.irritation} colorClass="bg-red-400" />
        )}
        {typeof memory.familiarity === 'number' && (
          <MemoryBar label="famil." value={memory.familiarity} colorClass="bg-neutral-400" />
        )}
        {typeof memory.repetition === 'number' && (
          <MemoryBar label="repet." value={memory.repetition} colorClass="bg-amber-400" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {memory.emotional_tone && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${TONE_STYLES[memory.emotional_tone] ?? TONE_STYLES.neutral}`}>
            {memory.emotional_tone}
          </span>
        )}
        {memory.state_name && (
          <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
            {memory.state_name}
            {typeof memory.state_intensity === 'number' && (
              <span className="ml-1 text-neutral-600">{memory.state_intensity.toFixed(2)}</span>
            )}
          </span>
        )}
      </div>

      {memory.recurring_topics && memory.recurring_topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {memory.recurring_topics.map(t => (
            <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-500">{t}</span>
          ))}
        </div>
      )}

      {memory.last_trigger && (
        <p className="mt-2 text-[10px] text-neutral-600">
          last trigger: <span className="text-neutral-500">{memory.last_trigger}</span>
        </p>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.sender_role === 'user';
  const { primary, secondary, shadowText } = getMessageStrategy(msg);
  const hasSafety = !!msg.safety_flag;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2.5 text-xs ${
          hasSafety
            ? 'border border-red-500/40 bg-red-950/30'
            : isUser
              ? 'border border-white/8 bg-white/[0.04]'
              : 'border border-lime-400/10 bg-lime-400/[0.04]'
        }`}
      >
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isUser ? 'text-neutral-500' : 'text-lime-400/80'}`}>
            {isUser ? 'user' : 'V'}
          </span>
          {hasSafety && (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">⚠ safety</span>
          )}
          {primary && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${STRATEGY_STYLES[primary] ?? 'bg-neutral-800 text-neutral-400'}`}>
              {primary}
            </span>
          )}
          {secondary && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono opacity-60 ${STRATEGY_STYLES[secondary] ?? 'bg-neutral-800 text-neutral-400'}`}>
              {secondary}
            </span>
          )}
          <span className="ml-auto text-[10px] text-neutral-700">
            {formatDate(msg.created_at)}
          </span>
        </div>

        <p className="whitespace-pre-wrap leading-5 text-neutral-300">{msg.body}</p>

        {shadowText && (
          <details className="mt-2">
            <summary className="cursor-pointer select-none text-[10px] text-neutral-700 hover:text-neutral-500">
              shadow text
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap text-[11px] italic leading-5 text-neutral-500">{shadowText}</p>
          </details>
        )}
      </div>
    </div>
  );
}

function ConversationDetail({
  conv,
  onExport,
}: {
  conv: Conversation;
  onExport: (id: string) => void;
}) {
  const memory = getRelationshipMemory(conv);
  const userMsgCount = conv.messages.filter(m => m.sender_role === 'user').length;
  const assistantMsgCount = conv.messages.filter(m => m.sender_role === 'assistant').length;
  const safetyCount = conv.messages.filter(m => m.safety_flag).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/6 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-100">
              {conv.user_email ?? <span className="text-neutral-600">ismeretlen</span>}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-600">
              session: {shortId(conv.session_id)}
              {conv.user_id && <> · user: {shortId(conv.user_id)}</>}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-700">Létrehozva: {formatDate(conv.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={() => onExport(conv.id)}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-200"
          >
            Export JSONL
          </button>
        </div>
        <div className="mt-3 flex gap-3 text-[11px]">
          <span><span className="text-neutral-300">{userMsgCount}</span> <span className="text-neutral-700">user</span></span>
          <span><span className="text-neutral-300">{assistantMsgCount}</span> <span className="text-neutral-700">V</span></span>
          {safetyCount > 0 && (
            <span><span className="text-red-400">{safetyCount}</span> <span className="text-neutral-700">safety</span></span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {memory && (
          <div className="mb-5">
            <RelationshipPanel memory={memory} />
          </div>
        )}
        <div className="flex flex-col gap-3">
          {conv.messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {conv.messages.length === 0 && (
            <p className="py-6 text-center text-xs text-neutral-700">Nincsenek üzenetek.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DashboardView({ conversations, fetchedAt, stats }: DashboardViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [showDetail, setShowDetail] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(30);

  useEffect(() => {
    countdownRef.current = 30;
    setCountdown(30);
    const tick = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        router.refresh();
      }
    }, 1_000);
    return () => clearInterval(tick);
  }, [router]);

  const filtered = conversations.filter(c =>
    !search || (c.user_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;

  async function handleExport(convId: string) {
    const res = await fetch(`/api/admin/gyontatoszek/export?conversation_id=${convId}`);
    if (!res.ok) { alert('Export sikertelen.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conv-${convId.slice(0, 8)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/6 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/60">Admin · V3</p>
            <h1 className="mt-0.5 text-lg text-neutral-100">Conversations</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-neutral-700 sm:block">
              Frissítve: {formatDate(fetchedAt)} · auto {countdown}s
            </span>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-lg border border-white/10 px-4 py-1.5 text-[11px] text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-200"
            >
              Frissítés
            </button>
          </div>
        </div>
        <div className="mt-4">
          <StatCards stats={stats} />
        </div>
      </header>

      {/* Master-detail body */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside
          className={`flex shrink-0 flex-col border-r border-white/6 bg-neutral-950 ${
            showDetail ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96`}
        >
          <div className="shrink-0 border-b border-white/6 px-3 py-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szűrés email alapján…"
              className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-neutral-100 placeholder-neutral-700 outline-none focus:border-lime-400/30"
            />
            <p className="mt-2 text-[10px] text-neutral-700">
              {filtered.length} / {conversations.length} conversation
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(conv => {
              const memory = getRelationshipMemory(conv);
              const isSelected = conv.id === selectedId;
              const hasSafety = conv.messages.some(m => m.safety_flag);

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => { setSelectedId(conv.id); setShowDetail(true); }}
                  className={`w-full border-b border-white/4 px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                    isSelected ? 'border-l-2 border-l-lime-400/60 bg-white/[0.05]' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium text-neutral-200">
                          {conv.user_email ?? <span className="text-neutral-600">anonymous</span>}
                        </p>
                        {hasSafety && <span className="shrink-0 text-[9px] text-red-400">⚠</span>}
                      </div>
                      <p className="mt-0.5 text-[10px] text-neutral-700">{conv.messages.length} üzenet</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-neutral-700">{relativeTime(conv.last_message_at)}</span>
                  </div>

                  {memory && (
                    <div className="mt-2 flex flex-col gap-1">
                      {typeof memory.trust === 'number' && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-right text-[9px] text-neutral-700">trust</span>
                          <div className="relative h-0.5 flex-1 rounded-full bg-white/6">
                            <div className="absolute left-0 top-0 h-0.5 rounded-full bg-lime-400/60" style={{ width: `${memory.trust * 100}%` }} />
                          </div>
                        </div>
                      )}
                      {typeof memory.irritation === 'number' && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-right text-[9px] text-neutral-700">irrit.</span>
                          <div className="relative h-0.5 flex-1 rounded-full bg-white/6">
                            <div className="absolute left-0 top-0 h-0.5 rounded-full bg-red-400/60" style={{ width: `${memory.irritation * 100}%` }} />
                          </div>
                        </div>
                      )}
                      {memory.emotional_tone && memory.emotional_tone !== 'neutral' && (
                        <span className={`mt-1 self-start rounded-full border px-1.5 py-px text-[9px] ${TONE_STYLES[memory.emotional_tone] ?? ''}`}>
                          {memory.emotional_tone}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-xs text-neutral-700">Nincs találat.</p>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main className={`min-w-0 flex-1 ${!showDetail ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center border-b border-white/6 px-4 py-2 md:hidden">
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="text-xs text-neutral-500 hover:text-neutral-200"
            >
              ← vissza
            </button>
          </div>

          {selectedConv ? (
            <ConversationDetail conv={selectedConv} onExport={handleExport} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-700">
              Válassz ki egy conversation-t.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
