"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
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
import PushPermissionPrompt from './gyontatoszek/PushPermissionPrompt';
import { createClient } from '@/lib/browser';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { sendMessagesAsJsonl } from '@/utils/exportFineTuning';

const SESSION_STORAGE_KEY = 'gyontatoszek-session-id';

const DEFAULT_V_MODULATION: VBehaviorModulation = {
  alcohol: 0.48,
  amphetamine: 0.38,
  thc: 0.72,
  dopamine: 0.32,
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

const INTENT_LABELS: Record<string, string> = {
  confession: 'vallomás',
  question: 'kérdés',
  challenge: 'kihívás / szembesítés',
  connection: 'kapcsolódás',
  self_reference: 'önreferencia',
  unknown: 'ismeretlen',
};

const TONE_LABELS: Record<string, string> = {
  neutral: 'semleges',
  vulnerable: 'sérülékeny',
  guarded: 'óvatos',
  tense: 'feszült',
  playful: 'játékos',
};

const RISK_LABELS: Record<string, string> = {
  low: 'alacsony',
  medium: 'közepes',
  high: 'magas',
};

const STRATEGY_HINTS: Record<string, string> = {
  mirror: 'V most inkább visszatükrözi, amit kimondasz, hogy jobban meghalld a saját mintádat.',
  confront: 'V itt direkt nekimegy az ellentmondásnak vagy az önáltatásnak, hogy kizökkentsen.',
  destabilize: 'V szándékosan kibillenti a biztos álláspontodat, hogy valami mélyebb is felszínre jöjjön.',
  validate_then_twist: 'Előbb megértést ad, aztán finoman átfordítja a nézőpontodat egy kényelmetlenebb igazság felé.',
  challenge_action: 'Nem maradna a szavaknál: abba az irányba tol, ahol már lépned is kellene.',
  withhold: 'V szándékosan visszafogja magát, hogy te töltsd ki a csendet azzal, amit eddig kerültél.',
};

const EMOTION_HUE: Record<string, number> = {
  vulnerable: 35,
  tense: 5,
  guarded: 220,
  playful: 160,
  neutral: 90,
  fear: 270,
  anger: 10,
  numb: 200,
};

const VSTATE_INTENSITY_BOOST: Record<string, number> = {
  confrontational: 0.45,
  'rare-honesty': 0.35,
  stimulated: 0.25,
  defensive: 0.15,
  testing: 0.1,
  baseline: 0,
  withdrawn: -0.1,
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

function buildVGuess(params: {
  traits: Array<{ label: string; value: number }>;
  motifs: string[];
  trust: number;
}): string | null {
  const topTrait = params.traits[0]?.label;
  const topMotif = params.motifs[0];
  const { trust } = params;

  if (!topTrait && !topMotif) return null;

  const options: string[] = [];
  if (topTrait) {
    options.push(`V-nek az a sejtése, hogy a "${topTrait}" nem szokás nálad, hanem valami régebbről jön.`);
  }
  if (topMotif) {
    options.push(`V szerint a "${topMotif}" nem véletlen visszatérés — van mögötte valami, amihez még nem értél el.`);
  }
  if (trust > 3.5) {
    options.push('Ennyi körből V-nek az az érzése: te nem segítséget keresel, hanem valakiit, aki nem tér ki.');
  }

  return options[0] ?? null;
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
    tangentCount: typeof behavior?.tangentCount === 'number' ? (behavior.tangentCount as number) : undefined,
    focusLevel: (() => {
      const vInt = typeof relationship?.state_intensity === 'number'
        ? clamp(relationship.state_intensity as number)
        : typeof runtimeState?.intensity === 'number'
          ? clamp(runtimeState.intensity as number)
          : 0.35;
      const rep = typeof relationship?.repetition === 'number' ? (relationship.repetition as number) : 0;
      const irr = typeof relationship?.irritation === 'number' ? (relationship.irritation as number) : 0;
      return clamp(vInt * (1 - Math.min(rep / 5, 0.6) * 0.5) * (1 - Math.min(irr / 5, 0.5) * 0.4));
    })(),
    vGuess: buildVGuess({ traits, motifs, trust: typeof relationship?.trust === 'number' ? (relationship.trust as number) : 0 }),
    messageCount: messages.length,
    vThoughts: (() => {
      const thoughts: string[] = [];
      const interp = asRecord(behavior?.interpretation);
      const stratPlan = asRecord(behavior?.strategyPlan);
      const decision = asRecord(behavior?.decision);

      const intent = typeof interp?.primaryIntent === 'string' ? interp.primaryIntent : null;
      const tone = typeof interp?.emotionalTone === 'string' ? interp.emotionalTone : null;
      const risk = typeof interp?.riskLevel === 'string' ? interp.riskLevel : null;
      const topics = Array.isArray(interp?.extractedTopics)
        ? (interp.extractedTopics as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 3)
        : [];

      if (intent) {
        thoughts.push(
          `láttam: ${INTENT_LABELS[intent] ?? intent}${tone ? ` — hangulat: ${TONE_LABELS[tone] ?? tone}` : ''}${risk && risk !== 'low' ? ` — kockázat: ${RISK_LABELS[risk] ?? risk}` : ''}`
        );
      }

      if (topics.length > 0) {
        thoughts.push(`témacsomók: ${topics.map(humanizeKey).join(', ')}`);
      }

      const reason = typeof stratPlan?.reason === 'string' ? stratPlan.reason.trim() : null;
      if (reason) thoughts.push(`miért ez a mód: ${reason}`);

      const objective = typeof stratPlan?.objective === 'string' ? stratPlan.objective.trim() : null;
      if (objective) thoughts.push(`cél: ${objective}`);

      const rationale = typeof decision?.rationale === 'string' ? decision.rationale.trim() : null;
      if (rationale && rationale !== reason && rationale !== objective) {
        thoughts.push(`belső note: ${rationale}`);
      }

      const distortion = asRecord(behavior?.distortion);
      const distortionCue = typeof distortion?.cue === 'string' ? distortion.cue.trim() : null;
      const distortionType = typeof distortion?.type === 'string' ? distortion.type : null;
      if (distortionType && distortionType !== 'none') {
        thoughts.push(distortionCue ? `torzítás: ${distortionCue}` : `torzítás bekapcsolva: ${distortionType}`);
      }

      return thoughts;
    })(),
    vReasoning: (() => {
      const stratPlan = asRecord(behavior?.strategyPlan);
      const interp = asRecord(behavior?.interpretation);
      if (!stratPlan && !interp) return undefined;
      const chunks = Array.isArray(behavior?.retrievedChunks)
        ? (behavior.retrievedChunks as unknown[]).filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
        : [];
      const wt = behavior?.weightTrace && typeof behavior.weightTrace === 'object' && !Array.isArray(behavior.weightTrace)
        ? (behavior.weightTrace as Record<string, number>)
        : null;
      return {
        strategyMode: typeof stratPlan?.mode === 'string' ? stratPlan.mode : '',
        strategyReason: typeof stratPlan?.reason === 'string' ? stratPlan.reason : '',
        strategyObjective: typeof stratPlan?.objective === 'string' ? stratPlan.objective : '',
        strategyTone: typeof stratPlan?.tone === 'string' ? stratPlan.tone : '',
        intent: typeof interp?.primaryIntent === 'string' ? interp.primaryIntent : '',
        emotionalTone: typeof interp?.emotionalTone === 'string' ? interp.emotionalTone : '',
        riskLevel: typeof interp?.riskLevel === 'string' ? interp.riskLevel : '',
        topics: Array.isArray(interp?.extractedTopics)
          ? (interp.extractedTopics as unknown[]).filter((t): t is string => typeof t === 'string')
          : [],
        confidence: typeof interp?.confidence === 'number' ? interp.confidence : 0,
        weightTrace: wt,
        ragPreviews: chunks.slice(0, 3).map(c => ({
          preview: typeof c.preview === 'string' ? c.preview : '',
          themes: Array.isArray(c.themes) ? (c.themes as unknown[]).filter((t): t is string => typeof t === 'string') : [],
          score: typeof c.score === 'number' ? c.score : 0,
        })),
      };
    })(),
    shadowText: typeof behavior?.shadowText === 'string' ? behavior.shadowText : undefined,
  };
}

function UserAvatar({ url }: { url?: string }) {
  const [broken, setBroken] = useState(false);
  const cls = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[13px] text-neutral-400 ring-1 ring-white/10';

  if (!url || broken) {
    return <span className={cls}>U</span>;
  }

  return (
    <img
      src={url}
      alt="avatar"
      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      onError={() => setBroken(true)}
      referrerPolicy="no-referrer"
    />
  );
}

export default function ConfessionalPanel() {
  const router = useRouter();
  const { session, loading: loadingSession } = useSessionGuard() as {
    session: { access_token?: string; user?: { id?: string; email?: string | null; user_metadata?: { avatar_url?: string } } } | null;
    loading: boolean;
  };
  const supabaseRef = useRef(createClient());
  const storageKeyRef = useRef(SESSION_STORAGE_KEY);
  const [confession, setConfession] = useState('');
  const [messages, setMessages] = useState<GyontatasMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReading, setShowReading] = useState(false);
  const [modulation, setModulation] = useState<VBehaviorModulation>(DEFAULT_V_MODULATION);
  const [preThoughts, setPreThoughts] = useState<string[]>([]);
  const [shadowText, setShadowText] = useState<string>('');
  const [dismissedAtCount, setDismissedAtCount] = useState(0);
  const [depthTier, setDepthTier] = useState<number>(0);
  const [shareToast, setShareToast] = useState(false);

  // Default to open on desktop (lg: 1024px+), closed on mobile
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setShowReading(true);
    }
  }, []);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoScrollRef = useRef(true);
  const readingInsight = useMemo(() => buildReadingInsight(messages), [messages]);

  const ambientState = useMemo(() => {
    const latest = [...messages]
      .reverse()
      .find((m) => m.sender_role === 'assistant' && asRecord(m.metadata)?.behavior);
    if (!latest) return null;
    const behavior = asRecord(asRecord(latest.metadata)?.behavior);
    const rs = asRecord(behavior?.runtimeState);
    const rel = asRecord(behavior?.relationship) ?? asRecord(behavior?.persistentMemory);
    return {
      emotion: typeof rs?.emotion === 'string' ? rs.emotion : 'neutral',
      intensity: typeof rs?.intensity === 'number' ? (rs.intensity as number) : 0.4,
      vState: typeof rel?.state_name === 'string' ? rel.state_name : 'baseline',
    };
  }, [messages]);

  const ambientHue = ambientState ? (EMOTION_HUE[ambientState.emotion] ?? 90) : 90;
  const ambientIntensity = ambientState
    ? Math.min(1, Math.max(0, ambientState.intensity + (VSTATE_INTENSITY_BOOST[ambientState.vState] ?? 0)))
    : 0;

  const userQuestionCount = messages.filter(m => m.sender_role === 'user').length;
  const showExportBanner = userQuestionCount >= 10;
  const canExport = userQuestionCount >= 10 && userQuestionCount - dismissedAtCount >= 10;

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
          window.localStorage.setItem(storageKeyRef.current, data.session_id);
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

    const userId = session?.user?.id;
    const storageKey = userId ? `${SESSION_STORAGE_KEY}-${userId}` : SESSION_STORAGE_KEY;
    storageKeyRef.current = storageKey;

    let storedSessionId = '';

    try {
      storedSessionId = window.localStorage.getItem(storageKey) || '';
      if (!storedSessionId) {
        storedSessionId = generateSessionId();
        window.localStorage.setItem(storageKey, storedSessionId);
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

  async function handleShare(body: string, shadow?: string) {
    const strip = (t: string) =>
      t.replace(/~~([\/\s\S]+?)~~/g, '$1').replace(/\[\[[\s\S]+?\]\]/g, '').replace(/\s+/g, ' ').trim();
    const q = strip(body);
    const s = shadow ? strip(shadow) : '';
    const params = new URLSearchParams({ q });
    if (s) params.set('s', s);
    const url = `/api/og/gyonta?${params.toString()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('image fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'vallalhatatlan-v.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // fallback: open the image in a new tab
      window.open(url, '_blank');
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }

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
    setShadowText('');
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

      // Capture follow-up hint before stream consumption (headers available immediately)
      const rawDepthTier = res.headers.get('x-depth-tier');
      if (rawDepthTier) setDepthTier(Number(rawDepthTier));

      const rawFollowUpHint = res.headers.get('x-follow-up-hint');
      const followUpHint = rawFollowUpHint ? (() => { try { return decodeURIComponent(rawFollowUpHint); } catch { return null; } })() : null;

      const rawPreThoughts = res.headers.get('x-pre-thoughts');
      if (rawPreThoughts) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawPreThoughts)) as unknown;
          if (Array.isArray(parsed)) setPreThoughts(parsed as string[]);
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
      const hasShadow = res.headers.get('x-has-shadow') === '1';
      let shadowBuf = '';
      let shadowDone = !hasShadow;
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!shadowDone) {
          const combined = shadowBuf + chunk;
          const markerIdx = combined.indexOf('\x1E');
          if (markerIdx !== -1) {
            shadowBuf = combined.slice(0, markerIdx);
            assistantText = combined.slice(markerIdx + 1);
            shadowDone = true;
            setShadowText(shadowBuf);
            if (assistantText) {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === optimisticAssistantId ? { ...message, body: assistantText } : message
                )
              );
            }
          } else {
            shadowBuf = combined;
            setShadowText(shadowBuf);
          }
        } else {
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === optimisticAssistantId ? { ...message, body: assistantText } : message
            )
          );
        }

        if (autoScrollRef.current) {
          window.requestAnimationFrame(() => {
            scrollThreadToBottom('auto');
          });
        }
      }

      await loadHistory(returnedSessionId || sessionId, { preserveView: true });
      scrollThreadToBottom('auto');
      setLoadingHistory(false);
      setPreThoughts([]);
      setShadowText('');

      // Schedule follow-up interrupt: V "remembers" something 3-5s after the main reply
      if (followUpHint) {
        const delay = 3000 + Math.random() * 2000;
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            createOptimisticMessage(`follow-up-${Date.now()}`, 'assistant', followUpHint),
          ]);
          autoScrollRef.current = true;
          window.requestAnimationFrame(() => scrollThreadToBottom('smooth'));
        }, delay);
      }
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

  const [showSupport, setShowSupport] = useState(() => {
    try { return window.localStorage.getItem('v3_support_dismissed') !== '1'; } catch { return true; }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="w-full px-2 py-3 md:px-4 md:py-5"
      style={{ '--v-hue': ambientHue, '--v-intensity': ambientIntensity } as React.CSSProperties}
    >
      {/* Ambient emotional state glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse 90% 55% at 50% 100%, hsla(${ambientHue}, 55%, 35%, ${(ambientIntensity * 0.11).toFixed(3)}) 0%, transparent 68%)`,
          transition: 'background 4s ease-in-out',
        }}
      />
      {showSupport && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-lime-300/15 bg-[linear-gradient(90deg,rgba(140,255,160,0.08),rgba(255,255,255,0.02))] px-4 py-2 text-sm text-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-lime-300/75">Támogatás</p>
            <p className="truncate text-sm text-neutral-200">Támogasd a fejlesztést.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="https://buy.stripe.com/bJe9ATenoaR23C70RV8Ra0o"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-lime-100 transition hover:border-lime-300/55 hover:bg-lime-300/15 hover:text-lime-50"
            >
              Támogatom
            </a>
            <button
              type="button"
              aria-label="Bezár"
              onClick={() => {
                setShowSupport(false);
                try { window.localStorage.setItem('v3_support_dismissed', '1'); } catch {}
              }}
              className="rounded-full p-1 text-neutral-600 transition hover:text-neutral-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <ChatContainer
        scrollRef={threadRef}
        header={
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/65">Vállalhatatlan</p>
              <div className="flex items-center gap-2">
                <h1 className="text-balance text-2xl text-neutral-700 md:text-3xl">
                  v3.0
                </h1>
                {depthTier > 0 && (
                  <div className="mb-0.5 flex self-end items-center gap-[3px]" title={`mélységi szint: ${depthTier}`}>
                    {[1, 2, 3, 4].map((t) => (
                      <span
                        key={t}
                        className={`h-[3px] w-[3px] rounded-full transition-all duration-700 ${
                          t <= depthTier ? 'bg-lime-300/70' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/8 transition-opacity duration-200">
              <UserAvatar url={session?.user?.user_metadata?.avatar_url} />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={loggingOut}
                title={loggingOut ? 'Kilépés...' : 'Kilépés'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-neutral-400 transition hover:border-lime-300/40 hover:text-lime-200 disabled:opacity-50"
              >
                <LogOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowReading((current) => !current)}
                title={showReading ? 'Elrejt' : 'V látlelete'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-lime-300/20 bg-lime-300/5 text-lime-300/70 transition hover:border-lime-300/50 hover:text-lime-200"
              >
                <span className="flex gap-[3px]">
                  <span className="h-[3px] w-[3px] rounded-full bg-current" />
                  <span className="h-[3px] w-[3px] rounded-full bg-current" />
                  <span className="h-[3px] w-[3px] rounded-full bg-current" />
                </span>
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
            preThoughts={preThoughts}
            userEmail={session?.user?.email}
            showExportBanner={showExportBanner}
            canExport={canExport}
            exportPairCount={userQuestionCount}
            onExport={async () => {
              const token = session?.access_token;
              if (!token) throw new Error('Nincs token');
              await sendMessagesAsJsonl(messages, token, userQuestionCount);
            }}
            onDismissExport={() => setDismissedAtCount(userQuestionCount)}
            depthTier={depthTier}
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
        <MessageList messages={messages} loading={loadingHistory} sending={sending} thcLevel={modulation.thc} preThoughts={preThoughts} shadowText={shadowText} onShare={handleShare} />
      </ChatContainer>
      <PushPermissionPrompt accessToken={session?.access_token} />

      {/* Share / download toast */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-lime-300/20 bg-neutral-900/90 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-lime-300/80 backdrop-blur-sm transition-all duration-300 ${
          shareToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        letöltve
      </div>
    </motion.div>
  );
}
