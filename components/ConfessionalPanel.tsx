"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  MAX_GYONTATAS_MESSAGE_LENGTH,
  type GyontatasHistoryResponse,
  type GyontatasMessage,
  type VBehaviorModulation,
} from '@/lib/gyontatoszek/types';
import { ChatContainer } from './gyontatoszek/ChatContainer';
import { Composer } from './gyontatoszek/Composer';
import { MessageList } from './gyontatoszek/MessageList';
import { VReadingPanel, type VReadingInsight } from './gyontatoszek/VReadingPanel';
import { createClient } from '@/lib/browser';
import { useSessionGuard } from '@/hooks/useSessionGuard';

const SESSION_STORAGE_KEY = 'gyontatoszek-session-id';

const DEFAULT_V_MODULATION: VBehaviorModulation = {
  alcohol: 0.07,
  amphetamine: 0.26,
  thc: 0.63,
  dopamine: 0.23,
};

const EMOTION_LABELS: Record<string, string> = {
  vulnerable: 'sebezhető',
  tense: 'feszült',
  guarded: 'zárt',
  neutral: 'elcsendesült',
  playful: 'széttartó',
  fear: 'szorongó',
  anger: 'dacos',
  numb: 'kikapcsolt',
};

const STRATEGY_LABELS: Record<string, string> = {
  mirror: 'tükröz',
  confront: 'nekimegy',
  destabilize: 'kimozdít',
  validate_then_twist: 'megerősít, majd elfordít',
  challenge_action: 'cselekvésre szorít',
  withhold: 'visszatart',
};

const STRATEGY_HINTS: Record<string, string> = {
  mirror: 'V most inkább visszatükrözi, amit kimondasz, hogy jobban meghalld a saját mintádat.',
  confront: 'V itt direkt nekimegy az ellentmondásnak vagy az önáltatásnak, hogy kizökkentsen.',
  destabilize: 'V szándékosan kibillenti a biztos álláspontodat, hogy valami mélyebb is felszínre jöjjön.',
  validate_then_twist: 'Előbb megértést ad, aztán finoman átfordítja a nézőpontodat egy kényelmetlenebb igazság felé.',
  challenge_action: 'Nem maradna a szavaknál: abba az irányba tol, ahol már lépned is kellene.',
  withhold: 'V szándékosan visszafogja magát, hogy te töltsd ki a csendet azzal, amit eddig kerültél.',
};

const STANCE_LABELS: Record<string, string> = {
  wary: 'figyelő',
  guarded: 'óvatos',
  engaged: 'bevont',
  open: 'nyitott',
  volatile: 'ingatag',
};

const V_TONE_LABELS: Record<string, string> = {
  neutral: 'kiegyensúlyozott',
  warm: 'megenyhült',
  volatile: 'felkavart',
  vulnerable: 'résnyire nyitott',
  guarded: 'összezárt',
};

const V_STATE_LABELS: Record<string, string> = {
  baseline: 'alaphelyzet',
  stimulated: 'felajzott',
  defensive: 'védekező',
  confrontational: 'szembefeszülő',
  'rare-honesty': 'ritka őszinteség',
  withdrawn: 'visszahúzódó',
  testing: 'próbára tevő',
};

const V_STATE_HINTS: Record<string, string> = {
  baseline: 'V most stabilan figyel, még nem billent ki erősen.',
  stimulated: 'Valami megmozdította; ilyenkor gyorsabban és élesebben reagál.',
  defensive: 'Most inkább védi a saját pozícióját, mintsem közelebb engedjen.',
  confrontational: 'Beleáll a feszültségbe, nem akarja elsimítani az ütközést.',
  'rare-honesty': 'Ritka rés nyílt rajta; ilyenkor többet enged látszani magából.',
  withdrawn: 'V most visszalépett és inkább figyel, mint feltár.',
  testing: 'Próbára teszi a helyzetet és a te reakcióidat is.',
};

const V_TRIGGER_LABELS: Record<string, string> = {
  intrusive: 'valami túl közel jött',
  insight: 'egy felismerés megmozdította',
  repetition: 'az ismétlődés felhúzta',
  control: 'a kontrollharc élesítette',
};

const TRAIT_LABELS: Record<string, string> = {
  impulsive: 'hirtelen mozdulat',
  avoidant: 'kerülőív',
  controlSeeking: 'kontrolléhség',
  approvalSeeking: 'visszaigazoláséhség',
  ruminative: 'rágódás',
  noveltySeeking: 'új ingerre mozdul',
};

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

function autoResize(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = '0px';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function humanizeKey(value: string) {
  return value.replace(/[_-]+/g, ' ').trim();
}

function buildReadingInsight(messages: GyontatasMessage[]): VReadingInsight | null {
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.sender_role === 'assistant' && asRecord(message.metadata)?.behavior);

  if (!latestAssistant) {
    return null;
  }

  const metadata = asRecord(latestAssistant.metadata);
  const behavior = asRecord(metadata?.behavior);
  const runtimeState = asRecord(behavior?.runtimeState);
  const profile = asRecord(behavior?.profile);
  const relationship = asRecord(behavior?.relationship) ?? asRecord(behavior?.persistentMemory);
  const hiddenTraits = asRecord(profile?.hiddenTraits);
  const rawPatternSource = behavior?.patternMemory;
  const rawPatterns: unknown[] = Array.isArray(rawPatternSource) ? [...rawPatternSource] : [];

  const traits = Object.entries(hiddenTraits ?? {})
    .map(([key, rawValue]) => {
      const record = asRecord(rawValue);
      const value = typeof record?.value === 'number' ? clamp(record.value) : 0;
      return {
        label: TRAIT_LABELS[key] ?? humanizeKey(key),
        value,
      };
    })
    .filter((item) => item.value > 0.25)
    .sort((left, right) => right.value - left.value)
    .slice(0, 4);

  const motifs = rawPatterns
    .map((pattern) => asRecord(pattern))
    .filter((pattern): pattern is Record<string, unknown> => Boolean(pattern))
    .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
    .slice(0, 4)
    .map((pattern) => {
      const key = typeof pattern.name === 'string' ? pattern.name : typeof pattern.key === 'string' ? pattern.key : 'minta';
      return humanizeKey(key);
    });

  const openLoops = rawPatterns
    .map((pattern) => asRecord(pattern))
    .filter((pattern): pattern is Record<string, unknown> => Boolean(pattern))
    .filter((pattern) => pattern.category === 'risk' || Number(pattern.score ?? 0) > 0.72)
    .slice(0, 3)
    .map((pattern) => {
      if (typeof pattern.summary === 'string' && pattern.summary.trim()) {
        return pattern.summary;
      }
      const name = typeof pattern.name === 'string' ? pattern.name : 'elakadás';
      return humanizeKey(name);
    });

  const emotion = typeof runtimeState?.emotion === 'string' ? runtimeState.emotion : 'neutral';
  const strategy = typeof runtimeState?.strategy === 'string' ? runtimeState.strategy : typeof behavior?.strategy === 'string' ? behavior.strategy : 'mirror';
  const stance = typeof profile?.relationalStance === 'string' ? profile.relationalStance : 'wary';
  const vTone = typeof relationship?.emotional_tone === 'string' ? relationship.emotional_tone : 'neutral';
  const vState = typeof relationship?.state_name === 'string' ? relationship.state_name : 'baseline';
  const vTrigger = typeof relationship?.last_trigger === 'string' ? relationship.last_trigger : undefined;
  const vTopics = Array.isArray(relationship?.recurring_topics)
    ? relationship.recurring_topics
        .filter((item): item is string => typeof item === 'string')
        .map((item) => humanizeKey(item))
        .slice(0, 5)
    : motifs.slice(0, 5);

  return {
    emotion: EMOTION_LABELS[emotion] ?? humanizeKey(emotion),
    intensity: typeof runtimeState?.intensity === 'number' ? clamp(runtimeState.intensity) : 0.4,
    strategy: STRATEGY_LABELS[strategy] ?? humanizeKey(strategy),
    strategyHint: STRATEGY_HINTS[strategy],
    stance: STANCE_LABELS[stance] ?? humanizeKey(stance),
    trust: typeof relationship?.trust === 'number' ? relationship.trust : 0,
    irritation: typeof relationship?.irritation === 'number' ? relationship.irritation : 0,
    openness: typeof profile?.openness === 'number' ? profile.openness : 0,
    traits,
    motifs,
    openLoops,
    vEmotion: V_TONE_LABELS[vTone] ?? humanizeKey(vTone),
    vState: V_STATE_LABELS[vState] ?? humanizeKey(vState),
    vStateHint: V_STATE_HINTS[vState],
    vIntensity:
      typeof relationship?.state_intensity === 'number'
        ? clamp(relationship.state_intensity)
        : typeof runtimeState?.intensity === 'number'
          ? clamp(runtimeState.intensity)
          : 0.35,
    vTone: V_TONE_LABELS[vTone] ?? humanizeKey(vTone),
    vTrigger: vTrigger ? V_TRIGGER_LABELS[vTrigger] ?? humanizeKey(vTrigger) : undefined,
    vTopics,
    vSignals: [
      { label: 'bizalom', value: typeof relationship?.trust === 'number' ? relationship.trust : 0 },
      { label: 'súrlódás', value: typeof relationship?.irritation === 'number' ? relationship.irritation : 0 },
      { label: 'ismétlés', value: typeof relationship?.repetition === 'number' ? relationship.repetition : 0 },
    ],
    updatedAt: latestAssistant.created_at,
  };
}

export default function ConfessionalPanel() {
  const router = useRouter();
  const { session, loading: loadingSession } = useSessionGuard() as {
    session: { access_token?: string; user?: { email?: string | null } } | null;
    loading: boolean;
  };
  const supabaseRef = useRef(createClient());
  const [confession, setConfession] = useState('');
  const [messages, setMessages] = useState<GyontatasMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReading, setShowReading] = useState(false);
  const [modulation, setModulation] = useState<VBehaviorModulation>(DEFAULT_V_MODULATION);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoScrollRef = useRef(true);
  const readingInsight = useMemo(() => buildReadingInsight(messages), [messages]);

  function scrollThreadToBottom(behavior: ScrollBehavior = 'auto') {
    const node = threadRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior });
  }

  async function loadHistory(currentSessionId: string, options?: { preserveView?: boolean }) {
    const showLoader = !options?.preserveView;

    try {
      if (showLoader) {
        setLoadingHistory(true);
      }
      const { data: sessionData } = await supabaseRef.current.auth.getSession();
      const token = sessionData?.session?.access_token || session?.access_token;
      const res = await fetch(`/api/gyontatoszek?session_id=${encodeURIComponent(currentSessionId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.replace('/auth?from=/v3');
        return;
      }

      if (!res.ok) {
        throw new Error('Nem sikerult betolteni az elozmenyeket.');
      }

      const data = (await res.json()) as GyontatasHistoryResponse;
      if (data.session_id && data.session_id !== currentSessionId) {
        setSessionId(data.session_id);
        try {
          window.localStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
        } catch {}
      }
      setMessages(data.messages || []);
    } catch {
      setError('Nem sikerult visszatolteni a beszelgetest.');
    } finally {
      if (showLoader) {
        setLoadingHistory(false);
      }
    }
  }

  useEffect(() => {
    if (loadingSession) {
      return;
    }

    if (!session) {
      router.replace('/auth?from=/v3');
      return;
    }

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
    void loadHistory(storedSessionId);
  }, [loadingSession, router, session]);

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [confession]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) {
      return;
    }

    const updateAutoScroll = () => {
      autoScrollRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    };

    updateAutoScroll();
    node.addEventListener('scroll', updateAutoScroll, { passive: true });

    return () => {
      node.removeEventListener('scroll', updateAutoScroll);
    };
  }, [loadingHistory]);

  useEffect(() => {
    if (loadingHistory || !autoScrollRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollThreadToBottom(sending ? 'auto' : 'smooth');
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [messages, loadingHistory, sending]);

  async function submitConfession() {
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
    autoScrollRef.current = true;
    setMessages((prev) => [
      ...prev,
      createOptimisticMessage(optimisticUserId, 'user', trimmed),
      createOptimisticMessage(optimisticAssistantId, 'assistant', ''),
    ]);

    try {
      const { data } = await supabaseRef.current.auth.getSession();
      const token = data?.session?.access_token || session?.access_token;

      const res = await fetch('/api/gyontatoszek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confession: trimmed, session_id: sessionId, modulation }),
      });

      const returnedSessionId = res.headers.get('x-session-id');
      if (returnedSessionId && returnedSessionId !== sessionId) {
        setSessionId(returnedSessionId);
        try {
          window.localStorage.setItem(SESSION_STORAGE_KEY, returnedSessionId);
        } catch {}
      }

      if (res.status === 401) {
        router.replace('/auth?from=/v3');
        return;
      }

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

        if (autoScrollRef.current) {
          window.requestAnimationFrame(() => {
            scrollThreadToBottom('auto');
          });
        }
      }

      await loadHistory(returnedSessionId || sessionId, { preserveView: true });
      scrollThreadToBottom('auto');
      setLoadingHistory(false);
    } catch {
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId)
      );
      setConfession(trimmed);
      setError('Hiba tortent. Probald ujra.');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitConfession();
  }

  async function handleSignOut() {
    setLoggingOut(true);
    await supabaseRef.current.auth.signOut();
    router.replace('/auth?from=/v3');
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitConfession();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="w-full px-2 py-3 md:px-4 md:py-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-lime-300/15 bg-[linear-gradient(90deg,rgba(140,255,160,0.08),rgba(255,255,255,0.02))] px-4 py-2 text-sm text-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-lime-300/75">Támogatás</p>
          <p className="truncate text-sm text-neutral-200">Támogasd a fejlesztést.</p>
        </div>
        <a
          href="https://buy.stripe.com/bJe9ATenoaR23C70RV8Ra0o"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-lime-100 transition hover:border-lime-300/55 hover:bg-lime-300/15 hover:text-lime-50"
        >
          Támogatom
        </a>
      </div>

      <ChatContainer
        scrollRef={threadRef}
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/65">Vállalhatatlan</p>
              <h1 className="text-balance text-2xl text-neutral-700 md:text-3xl">
                v3.0
              </h1>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/8 md:min-w-[320px] md:justify-end">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Bejelentkezve</p>
                <p className="truncate text-sm text-neutral-200">{session?.user?.email ?? 'ismeretlen user'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReading((current) => !current)}
                  className="rounded-full border border-lime-300/20 bg-lime-300/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-lime-100 transition hover:border-lime-300/50 hover:text-lime-50 md:hidden"
                >
                  {showReading ? 'Elrejt' : 'V látlelete'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={loggingOut}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-lime-300/40 hover:text-lime-200 disabled:opacity-50"
                >
                  {loggingOut ? 'Kilepes...' : 'Kilepes'}
                </button>
              </div>
            </div>
          </div>
        }
        aside={
          <VReadingPanel
            insight={readingInsight}
            modulation={modulation}
            onModulationChange={setModulation}
            onClose={() => setShowReading(false)}
          />
        }
        asideOpen={showReading}
        onCloseAside={() => setShowReading(false)}
        composer={
          <form onSubmit={handleSubmit}>
            <Composer
              value={confession}
              sending={sending || loggingOut}
              loading={loadingHistory || loadingSession || loggingOut}
              error={error}
              textareaRef={textareaRef}
              onChange={setConfession}
              onSubmit={() => void submitConfession()}
              onKeyDown={handleComposerKeyDown}
            />
          </form>
        }
      >
        <MessageList messages={messages} loading={loadingHistory} sending={sending} />
      </ChatContainer>
    </motion.div>
  );
}
