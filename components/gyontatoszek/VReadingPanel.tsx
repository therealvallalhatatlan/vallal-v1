"use client";

import { type ReactNode, useState } from 'react';
import type { VBehaviorModulation } from '@/lib/gyontatoszek/types';
import { ExportBanner } from './ExportBanner';

interface ReadingMetric {
  label: string;
  value: number;
}

type ReadingTab = 'user' | 'self' | 'modulation';

const EMPTY_MODULATION: VBehaviorModulation = {
  alcohol: 0.22,
  amphetamine: 0.38,
  thc: 0.52,
  dopamine: 0.32,
};

const MODULATION_PRESETS: Array<{ label: string; description: string; value: VBehaviorModulation }> = [
  {
    label: 'Szokásos',
    description: 'alapállapot — enyhén lazult, valamelyest fókuszált, kicsit asszociatív sodródó',
    value: { alcohol: 0.22, amphetamine: 0.38, thc: 0.52, dopamine: 0.32 },
  },
  {
    label: 'Hiperfixált',
    description: 'géppuskás ritmus, tőmondatok, cselekvésre tol — nincsen türelem a körmönfontra',
    value: { alcohol: 0.04, amphetamine: 0.88, thc: 0.12, dopamine: 0.68 },
  },
  {
    label: 'Másnapos',
    description: 'szétszórt és messze, halvány hallucinatív szál — fehér kutyák és figyelmi crash',
    value: { alcohol: 0.20, amphetamine: 0.06, thc: 0.78, dopamine: 0.09 },
  },
];

const VTHOUGHT_PREFIX_TOOLTIPS: Record<string, string> = {
  'láttam:': 'Mit olvasott ki V az üzenetedből — milyen szándékot, hangulati tónust és kockázatot azonosított',
  'témacsomók:': 'Milyen konkrét témákat, motívumokat vett észre V a szövegben — ezekre fog visszautalni',
  'miért ez a mód:': 'Miért választotta ezt a stratégiát — V saját belső indoklása a megközelítés mögött',
  'cél:': 'Mi volt V tudatos célja a válasszal — mit akart kiváltani vagy elérni benned',
  'belső note:': 'V privát megjegyzése önmagának a döntésről — nem szánt neked, mégis látod',
  'torzítás:': 'Aktiválódott-e valamilyen ADHD-torzítás — tangent, interrupt, vagy más eltérítő mód',
};

function getVThoughtTooltip(thought: string): string | undefined {
  for (const prefix of Object.keys(VTHOUGHT_PREFIX_TOOLTIPS)) {
    if (thought.startsWith(prefix)) return VTHOUGHT_PREFIX_TOOLTIPS[prefix];
  }
  return undefined;
}

const METRIC_TOOLTIPS: Record<string, string> = {
  'hirtelen mozdulat': 'Impulzív döntések, hirtelen irányváltások mintázata — V már észlelt belőled ilyet',
  'kerülőív': 'Témák vagy érzések megkerülésének mintázata — amit inkább kikerülsz, mint szembenézel',
  'kontrolléhség': 'Az irányítás igénye — hajlam arra, hogy te diktáld a keretet és a haladás ütemét',
  'visszaigazoláséhség': 'Megerősítést kereső dinamika — V érzékeli, mikor vársz igenre',
  'rágódás': 'Visszatérő körök ugyanazon a ponton — V látja, ha újra és újra visszatérsz valamihez',
  'új ingerre mozdul': 'Újdonságéhség — V észrevette, mikor csap le valami frissre',
};

const SIGNAL_TOOLTIPS: Record<string, string> = {
  bizalom: 'Mennyit engedett már közel magához V — lassan épül, gyorsan romlik',
  súrlódás: 'Felhalmozódott feszültség V oldalán — ha magas, élesebb vagy türelmetlenebb választ kaphatsz',
  ismétlés: 'Mennyire érzékeli V, hogy ugyanazokat a köröket járod — magas értéknél lecsendülhet vagy élesedhet',
};

export interface VReadingInsight {
  emotion: string;
  intensity: number;
  strategy: string;
  strategyHint?: string;
  stance: string;
  trust: number;
  irritation: number;
  openness: number;
  traits: ReadingMetric[];
  motifs: string[];
  openLoops: string[];
  vEmotion: string;
  vState: string;
  vStateHint?: string;
  vIntensity: number;
  vTone: string;
  vTrigger?: string;
  vTopics: string[];
  vSignals: ReadingMetric[];
  updatedAt?: string | null;
  tangentCount?: number;
  focusLevel?: number;
  vGuess?: string | null;
  messageCount?: number;
  vThoughts?: string[];
  shadowText?: string;
  vReasoning?: {
    strategyMode: string;
    strategyReason: string;
    strategyObjective: string;
    strategyTone: string;
    intent: string;
    emotionalTone: string;
    riskLevel: string;
    topics: string[];
    confidence: number;
    weightTrace: Record<string, number> | null;
    ragPreviews: { preview: string; themes: string[]; score: number }[];
  };
}

interface VReadingPanelProps {
  insight: VReadingInsight | null;
  modulation?: VBehaviorModulation;
  onModulationChange?: (value: VBehaviorModulation) => void;
  onClose?: () => void;
  preThoughts?: string[];
  userEmail?: string | null;
  showExportBanner?: boolean;
  canExport?: boolean;
  exportPairCount?: number;
  onExport?: () => Promise<void>;
  onDismissExport?: () => void;
  depthTier?: number;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function barWidth(value: number, max = 5) {
  return `${clamp(value / max) * 100}%`;
}

function intensityWidth(value: number) {
  return `${clamp(value) * 100}%`;
}

function prettyDate(value?: string | null) {
  if (!value) return 'most';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'most';

  return new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
function WithTooltip({ children, tip }: { children: ReactNode; tip: string }) {
  return (
    <span className="group relative inline-flex cursor-default items-center gap-1">
      {children}
      <span className="text-[9px] text-neutral-600 transition group-hover:text-lime-300/60">ⓘ</span>
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-lime-300/20 bg-black/95 px-3 py-2 text-[11px] normal-case tracking-normal text-neutral-200 opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition duration-200 group-hover:opacity-100">
        {tip}
      </span>
    </span>
  );
}

function SectionTitle({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
      {tooltip ? <WithTooltip tip={tooltip}>{label}</WithTooltip> : label}
    </p>
  );
}
function describeBlend(modulation: VBehaviorModulation) {
  const parts: string[] = [];

  if (modulation.alcohol < 0.18) parts.push('száraz+ingerült');
  else if (modulation.alcohol >= 0.68) parts.push('erősen ittas (elírások)');
  else if (modulation.alcohol >= 0.42) parts.push('kicsit laza');

  if (modulation.amphetamine < 0.15) parts.push('szétszórt crash');
  else if (modulation.amphetamine >= 0.65) parts.push('géppuskás tempó');
  else if (modulation.amphetamine >= 0.38) parts.push('fókuszált');

  if (modulation.thc < 0.18) parts.push('zárt+goromba');
  else if (modulation.thc >= 0.68) parts.push('hallucinatív csapongás');
  else if (modulation.thc >= 0.42) parts.push('asszociatív');

  if (modulation.dopamine < 0.15) parts.push('lapos nem-figyel');
  else if (modulation.dopamine >= 0.65) parts.push('energikus+meleg');
  else if (modulation.dopamine >= 0.35) parts.push('kíváncsi');

  return parts.length > 0 ? parts.join(' • ') : 'középső tartomány';
}

function MetricBar({ label, value, max = 5, tooltip }: { label: string; value: number; max?: number; tooltip?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-neutral-400">
        <span>{tooltip ? <WithTooltip tip={tooltip}>{label}</WithTooltip> : label}</span>
        <span className="text-lime-200/80">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(138,255,146,0.26),rgba(196,255,199,0.9))]"
          style={{ width: barWidth(value, max) }}
        />
      </div>
    </div>
  );
}

function InsightBadge({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="group relative">
      <div className="rounded-full border border-lime-300/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-lime-200/90">
        {label}
      </div>
      {hint ? (
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-lime-300/20 bg-black/95 px-3 py-2 text-[11px] normal-case tracking-normal text-neutral-200 opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition duration-200 group-hover:opacity-100">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description: string;
}) {
  return (
    <label className="block rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-200">{label}</p>
          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        </div>
        <span className="rounded-full border border-lime-300/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-lime-200/90">
          {Math.round(value * 100)}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-lime-300"
      />
    </label>
  );
}

export function VReadingPanel({ insight, modulation, onModulationChange, onClose, preThoughts, userEmail, showExportBanner, canExport, exportPairCount, onExport, onDismissExport, depthTier = 0 }: VReadingPanelProps) {
  const [activeTab, setActiveTab] = useState<ReadingTab>('self');
  const currentModulation = modulation ?? EMPTY_MODULATION;
  const title = activeTab === 'user' ? 'Ahogyan V lát téged' : activeTab === 'self' ? 'Ahogyan V érzi magát' : 'V beállításai';

  const updateModulation = (key: keyof VBehaviorModulation, value: number) => {
    onModulationChange?.({
      ...currentModulation,
      [key]: clamp(value),
    });
  };

  return (
    <aside className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(12,16,12,0.96)_0%,rgba(8,10,9,0.98)_100%)] text-neutral-100">
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-lime-300/70">{userEmail ?? 'V látlelete'}</p>
          <h2 className="mt-1 text-lg text-neutral-100">{title}</h2>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition hover:border-lime-300/40 hover:text-lime-200"
          >
            bezár
          </button>
        ) : null}
      </div>

      <div className="border-b border-white/8 px-4 py-3">
        <div role="tablist" aria-label="V nézetei" className="grid grid-cols-3 gap-2 rounded-2xl bg-white/[0.03] p-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'user'}
            onClick={() => setActiveTab('user')}
            className={`rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.16em] transition ${
              activeTab === 'user'
                ? 'bg-lime-300/10 text-lime-100 ring-1 ring-lime-300/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ahogyan V lát téged
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'self'}
            onClick={() => setActiveTab('self')}
            className={`rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.16em] transition ${
              activeTab === 'self'
                ? 'bg-lime-300/10 text-lime-100 ring-1 ring-lime-300/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ahogyan V érzi magát
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'modulation'}
            onClick={() => setActiveTab('modulation')}
            className={`rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.16em] transition ${
              activeTab === 'modulation'
                ? 'bg-lime-300/10 text-lime-100 ring-1 ring-lime-300/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            V beállításai
          </button>
        </div>
      </div>

      <div className="sidebar-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {activeTab === 'modulation' ? (
          <>
            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Session-moduláció</p>
              <p className="mt-2 text-sm text-neutral-300">
                Ezek a csúszkák csak a következő válaszoktól hatnak, és új sessionnél visszaállnak.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-lime-200/90">
                Várható hang: {describeBlend(currentModulation)}
              </p>
            </section>

            <section className="space-y-3">
              <SliderControl
                label="Alkoholszint"
                value={currentModulation.alcohol}
                onChange={(value) => updateModulation('alcohol', value)}
                description="alacsony → száraz+ingerült; magas → elírások, félbemaradt mondatok"
              />
              <SliderControl
                label="Amfetamin szint"
                value={currentModulation.amphetamine}
                onChange={(value) => updateModulation('amphetamine', value)}
                description="alacsony → szétszórt, nem bír figyelni; magas → tőmondatok, cselekvésre tol"
              />
              <SliderControl
                label="THC szint"
                value={currentModulation.thc}
                onChange={(value) => updateModulation('thc', value)}
                description="alacsony → zárkózott, goromba; magas → csapongó, hallucinatív, fehér kutyák"
              />
              <SliderControl
                label="Dopamin szint"
                value={currentModulation.dopamine}
                onChange={(value) => updateModulation('dopamine', value)}
                description="alacsony → érdektelen, csak hümmög; magas → energikus, meleg, ötletözön"
              />
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Gyors presetek</p>
              <div className="mt-3 grid gap-2">
                {MODULATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onModulationChange?.(preset.value)}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:border-lime-300/35 hover:text-lime-100"
                  >
                    <div className="text-sm text-neutral-100">{preset.label}</div>
                    <div className="mt-0.5 text-xs text-neutral-400">{preset.description}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onModulationChange?.(EMPTY_MODULATION)}
                  className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:border-lime-300/35 hover:text-lime-100"
                >
                  Nullázás
                </button>
              </div>
            </section>

            {showExportBanner && onExport && onDismissExport && (
              <ExportBanner
                pairCount={exportPairCount ?? 0}
                canExport={canExport ?? false}
                onExport={onExport}
                onDismiss={onDismissExport}
              />
            )}
          </>
        ) : !insight ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
            V még nem rajzolt ki elég erős képet rólad. Pár valódi kör után itt már többet fog mutatni.
          </div>
        ) : activeTab === 'user' ? (
          <>
            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Most benned" tooltip="A te aktuális érzelmi állapotod, ahogy V értelmezi — az utolsó üzenet alapján" />
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl text-lime-100">{insight.emotion}</p>
                  <p className="mt-1 text-xs text-neutral-400">V most így olvassa az alaphangulatod.</p>
                </div>
                <InsightBadge label={insight.strategy} hint={insight.strategyHint} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                  <span><WithTooltip tip="Mennyire erős érzelmileg ez a kör — 0% csendes, 100% csúcsra járatott">intenzitás</WithTooltip></span>
                  <span className="text-lime-200/80">{Math.round(insight.intensity * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(115,255,140,0.2),rgba(115,255,140,0.95))]"
                    style={{ width: intensityWidth(insight.intensity) }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Köztetek most" tooltip="A kettőtök viszonyának mért állapota — mennyire feszes, bizalmas vagy akadályokkal teli" />
              <div className="mt-3 space-y-3">
                <MetricBar label="bizalom" value={insight.trust} tooltip="Mennyit engedett már közel magához V — lassan épül, gyorsan romlik" />
                <MetricBar label="súrlódás" value={insight.irritation} tooltip="Felhalmozódott feszültség kettőtök között — nem feltétlenül rossz, néha ettől lesz éles" />
                <MetricBar label="nyitottság" value={insight.openness} tooltip="Mennyire érzi V, hogy valódi dolgokról beszélsz — nem performanszból, hanem tényleg" />
              </div>
              <p className="mt-3 text-xs text-neutral-400"><WithTooltip tip="V belső minősítése a kettőtök viszonyáról ebben a pillanatban">kapcsolati állás</WithTooltip>: <span className="text-neutral-200">{insight.stance}</span></p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Domináns mintázatok" tooltip="Ismétlődő témák vagy reakciók, amelyeket V visszatérőnek lát benned a korábbi körök alapján" />
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.motifs.length > 0 ? insight.motifs.map((motif) => (
                  <span
                    key={motif}
                    className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-neutral-200"
                  >
                    {motif}
                  </span>
                )) : <span className="text-xs text-neutral-500">még alakul</span>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Törésvonalak" tooltip="Nyitott hurkok — félbehagyott témák vagy kerülött pontok, amiket V észrevett, de még visszatartott" />
              <div className="mt-3 space-y-2">
                {insight.openLoops.length > 0 ? insight.openLoops.map((loop) => (
                  <div key={loop} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-neutral-200 ring-1 ring-white/6">
                    {loop}
                  </div>
                )) : <p className="text-xs text-neutral-500">nincs még elég nyitott hurok</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Rejtett húzások" tooltip="Belső erők, amiket V a mondásaid mintájából következtet ki — nem adatból, hanem ismétlésből és irányból" />
              <div className="mt-3 space-y-2">
                {insight.traits.length > 0 ? insight.traits.map((trait) => (
                  <MetricBar key={trait.label} label={trait.label} value={trait.value} max={1} tooltip={METRIC_TOOLTIPS[trait.label]} />
                )) : <p className="text-xs text-neutral-500">még nincs elég jel</p>}
              </div>
            </section>

            {insight.messageCount !== undefined && insight.messageCount >= 10 && insight.trust > 3.5 && insight.vGuess ? (
              <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
                <SectionTitle label="V sejtése rólad" tooltip="Ennyi kör után V összerakott valamit. Ez az ő hipotézise — nem diagnózis, nem tény." />
                <div className="mt-3 rounded-xl bg-black/25 px-4 py-3 text-sm italic text-amber-100/85 ring-1 ring-amber-400/15">
                  {insight.vGuess}
                </div>
              </section>
            ) : insight.messageCount !== undefined && insight.messageCount >= 10 && insight.trust > 3.5 ? (
              <section className="rounded-2xl border border-dashed border-amber-400/15 bg-amber-400/[0.02] p-4">
                <p className="text-xs text-amber-200/40">V összerak valamit. Hamarosan.</p>
              </section>
            ) : null}
          </>
        ) : (
          <>
            {insight.shadowText ? (
              <section className="rounded-2xl border border-white/6 bg-white/[0.025] p-4">
                <SectionTitle label="V belső hangja" tooltip="A szűretlen belső monológ — ami V fejében fut le mielőtt válaszol" />
                <p className="mt-3 border-l-2 border-lime-300/15 pl-3 text-sm italic leading-7 text-neutral-400">
                  {insight.shadowText}
                </p>
              </section>
            ) : null}

            {insight.vReasoning && insight.vReasoning.ragPreviews.filter(r => r.preview).length > 0 ? (
              <section className="rounded-2xl border border-white/6 bg-white/[0.025] p-4">
                <SectionTitle label="Előhívott memória" tooltip="A RAG-rendszer által előhívott releváns memóriák — korábbi tudás, amit V aktivált ebben a körben" />
                <div className="mt-3 space-y-2">
                  {insight.vReasoning.ragPreviews.filter(r => r.preview).map((r, i) => (
                    <div key={i} className="text-xs text-neutral-400 border-l-2 border-lime-300/20 pl-2">
                      <p className="text-neutral-300 italic">„{r.preview}"</p>
                      {r.themes.length > 0 && (
                        <p className="mt-0.5 text-neutral-600">{r.themes.join(' · ')} · {(r.score * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {insight.vReasoning ? (
              <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <SectionTitle label="Kommunikációs Stratégia" tooltip="V választott megközelítése és hangütése — hogyan és miért reagál így rád" />
                <p className="mt-3 text-sm font-medium text-lime-300/80">{insight.vReasoning.strategyMode} · {insight.vReasoning.strategyTone}</p>
                {insight.vReasoning.strategyReason && (
                  <p className="mt-1.5 text-xs text-neutral-300"><span className="text-neutral-600">miért: </span>{insight.vReasoning.strategyReason}</p>
                )}
                {insight.vReasoning.strategyObjective && (
                  <p className="mt-1 text-xs text-neutral-300"><span className="text-neutral-600">cél: </span>{insight.vReasoning.strategyObjective}</p>
                )}
                {insight.vReasoning.weightTrace && Object.keys(insight.vReasoning.weightTrace).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {Object.entries(insight.vReasoning.weightTrace)
                      .sort(([, a], [, b]) => b - a)
                      .map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-32 shrink-0 text-[11px] text-neutral-400 truncate">{key}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                            <div className="h-full rounded-full bg-lime-300/40" style={{ width: `${Math.min(val / 2, 1) * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-neutral-500 w-8 text-right">{val.toFixed(1)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            ) : null}

            {typeof insight.tangentCount === 'number' && insight.tangentCount > 0 ? (
              <section className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <SectionTitle label="V elkalandoz\u00e1sai" tooltip="H\u00e1nyszor vesztette el a fonalat \u00e9s t\u00e9rt vissza V ebben a sessionben \u2014 az ADHD m\u00e9rhet\u0151" />
                <div className="mt-2 text-sm text-neutral-400">
                  {insight.tangentCount === 1
                    ? 'V egyszer kalandozott el ma'
                    : `V ma ${insight.tangentCount}\u00d7 kalandozott el`}
                </div>
                {insight.tangentCount >= 3 ? (
                  <div className="mt-1 text-[11px] text-lime-300/40">a THC er\u0151s ma</div>
                ) : null}
              </section>
            ) : null}

            {preThoughts && preThoughts.length > 0 ? (
              <section className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.03] p-4">
                <SectionTitle label="V gondolatai" tooltip="Most dolgozik — ezek a válasz előtt keletkező belső töredékek" />
                <ul className="mt-3 space-y-2">
                  {preThoughts.map((thought, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs text-lime-300/60 ring-1 ring-lime-300/10 animate-pulse"
                    >
                      <span className="shrink-0 text-lime-300/30">—</span>
                      <span>{thought}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <SectionTitle label="V gondolatai" tooltip="Az előző válasz előtt keletkezett belső értelmezési lépések — mit olvasott ki, miért ezt a stratégiát, mit akart elérni" />
                {insight.vThoughts && insight.vThoughts.length > 0 ? (
                  <ol className="mt-3 space-y-2">
                    {insight.vThoughts.map((thought, i) => {
                      const tip = getVThoughtTooltip(thought);
                      return (
                        <li
                          key={i}
                          className="flex gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs text-neutral-400 ring-1 ring-white/5"
                        >
                          <span className="shrink-0 text-lime-300/30">{i + 1}.</span>
                          {tip ? (
                            <WithTooltip tip={tip}><span>{thought}</span></WithTooltip>
                          ) : (
                            <span>{thought}</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-xs text-neutral-600">még nincs feldolgozott üzenet</p>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Most V-ben" tooltip="Ahogy V önmagát érzékeli ebben a beszélgetésben — a saját belső állapota, nem a tiéd" />
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl text-lime-100">{insight.vEmotion}</p>
                  <p className="mt-1 text-xs text-neutral-400">így áll most hozzád és ehhez a beszélgetéshez.</p>
                </div>
                <InsightBadge label={insight.vState} hint={insight.vStateHint} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                  <span><WithTooltip tip="Mennyire van V 'felhúzva' — magasabb értéknél élesebb, tömörebb, kevésbé türelmes választ kaphatsz">belső intenzitás</WithTooltip></span>
                  <span className="text-lime-200/80">{Math.round(insight.vIntensity * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(115,255,140,0.2),rgba(115,255,140,0.95))]"
                    style={{ width: intensityWidth(insight.vIntensity) }}
                  />
                </div>
              </div>

              {typeof insight.focusLevel === 'number' ? (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                    <span><WithTooltip tip="Ha az ismétlés magas vagy V irritált, a figyelem elkalandozhat">v fókusza</WithTooltip></span>
                    <span className={insight.focusLevel > 0.5 ? 'text-lime-200/80' : 'text-amber-300/70'}>{Math.round(insight.focusLevel * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${insight.focusLevel > 0.5 ? 'bg-[linear-gradient(90deg,rgba(115,255,140,0.2),rgba(115,255,140,0.7))]' : 'bg-[linear-gradient(90deg,rgba(255,180,60,0.2),rgba(255,160,40,0.55))]'}`}
                      style={{ width: intensityWidth(insight.focusLevel) }}
                    />
                  </div>
                </div>
              ) : null}

              <p className="mt-3 text-xs text-neutral-400"><WithTooltip tip="V érzelmi regisztere veled szemben ebben a pillanatban — ahogy közelít vagy épp távolodik">kapcsolati tónus</WithTooltip>: <span className="text-neutral-200">{insight.vTone}</span></p>

              <div className="mt-4 border-t border-white/6 pt-4">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  <WithTooltip tip="Mennyire enged közel V ehhez a beszélgetéshez — alacsony szinten mér és tart távolságot, magas szinten nevezi meg a dolgokat és megmutathat egy pillanatra valamit magából">
                    mélységi szint
                  </WithTooltip>
                  <span className={depthTier >= 3 ? 'text-lime-300/80' : depthTier >= 1 ? 'text-neutral-300' : 'text-neutral-600'}>
                    {(['idegen', 'ismerős', 'belépő', 'mélyebb', 'bizalmas'] as const)[depthTier]}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className="h-1.5 flex-1 overflow-hidden rounded-full"
                      style={{ background: step <= depthTier ? undefined : 'rgba(255,255,255,0.06)' }}
                    >
                      {step <= depthTier && (
                        <div
                          className="h-full w-full rounded-full"
                          style={{
                            background: depthTier >= 4
                              ? 'linear-gradient(90deg,rgba(163,230,53,0.4),rgba(163,230,53,0.9))'
                              : depthTier >= 3
                              ? 'linear-gradient(90deg,rgba(115,255,140,0.3),rgba(115,255,140,0.75))'
                              : 'linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.35))',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Kapcsolat hőfoka" tooltip="V oldalán mért dinamikai jelzők — a kettőtök közötti erőtér mértéke V nézőpontjából" />
              <div className="mt-3 space-y-3">
                {insight.vSignals.map((signal) => (
                  <MetricBar key={signal.label} label={signal.label} value={signal.value} tooltip={SIGNAL_TOOLTIPS[signal.label]} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Amit még magánál tart" tooltip="Területek, amiket V már észrevett benned, de még nem hozott szóba — kivárja a megfelelő pillanatot" />
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.vTopics.length > 0 ? insight.vTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-neutral-200"
                  >
                    {topic}
                  </span>
                )) : <span className="text-xs text-neutral-500">még nem kapaszkodik semmibe erősen</span>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <SectionTitle label="Legutóbbi szikra" tooltip="Az az utolsó inger, ami V-t kimozdította vagy élesítette — lehetett egy szó, egy szünet vagy egy ismétlődő minta" />
              <div className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-sm text-neutral-200 ring-1 ring-white/6">
                {insight.vTrigger ?? 'most még nem hagyott egyetlen éles nyomot sem'}
              </div>
            </section>

            {insight.vReasoning ? (
              <details className="group rounded-2xl border border-white/6 bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                  <SectionTitle label="Pipeline részletek" tooltip="A teljes agent-pipeline reasoning — interpretáció, stratégia-indoklás, RAG-kontextus, súlyozás" />
                  <span className="text-[10px] text-neutral-600 transition group-open:text-lime-300/50">▸</span>
                </summary>
                <div className="space-y-3 px-4 pb-4">
                  <div className="rounded-xl bg-black/20 p-3 ring-1 ring-white/5 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Interpretáció</p>
                    <p className="text-xs text-neutral-300">
                      <span className="text-neutral-600">szándék:</span> {insight.vReasoning.intent}
                      {' · '}
                      <span className="text-neutral-600">hangulat:</span> {insight.vReasoning.emotionalTone}
                      {' · '}
                      <span className="text-neutral-600">kockázat:</span> {insight.vReasoning.riskLevel}
                      {' · '}
                      <span className="text-neutral-600">bizonyosság:</span> {Math.round(insight.vReasoning.confidence * 100)}%
                    </p>
                    {insight.vReasoning.topics.length > 0 && (
                      <p className="text-xs text-neutral-400">témák: {insight.vReasoning.topics.join(', ')}</p>
                    )}
                  </div>
                </div>
              </details>
            ) : null}

          </>
        )}

        {insight ? (
          <p className="px-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            frissítve: {prettyDate(insight.updatedAt)}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
