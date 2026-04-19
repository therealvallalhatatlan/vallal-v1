"use client";

import { useState } from 'react';

interface Tier {
  min: number;
  label: string;
  sublabel: string;
  exportLabel: string;
  badge: string;
  bar: string;
  text: string;
}

const TIERS: Tier[] = [
  {
    min: 10,
    label: 'Ismőrős',
    sublabel: 'V már kezd valamit tudni rólad',
    exportLabel: 'alap export',
    badge: 'border-lime-400/30 bg-lime-400/10 text-lime-200',
    bar: 'bg-lime-400/70',
    text: 'text-lime-300',
  },
  {
    min: 25,
    label: 'Nyitott könyv',
    sublabel: 'Mintázatok rajzolódnak ki',
    exportLabel: 'mélyebb export',
    badge: 'border-teal-400/30 bg-teal-400/10 text-teal-200',
    bar: 'bg-teal-400/70',
    text: 'text-teal-300',
  },
  {
    min: 50,
    label: 'Bizalmas',
    sublabel: 'V komolyan vesz',
    exportLabel: 'intim export',
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    bar: 'bg-emerald-400/70',
    text: 'text-emerald-300',
  },
  {
    min: 100,
    label: 'Forrás',
    sublabel: 'Ritka adathalmaz — értékes fine-tune anyag',
    exportLabel: 'teljes export',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    bar: 'bg-amber-400/70',
    text: 'text-amber-300',
  },
];

function getCurrentTier(count: number): Tier {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (count >= t.min) tier = t;
  }
  return tier;
}

function getNextTier(count: number): Tier | null {
  for (const t of TIERS) {
    if (count < t.min) return t;
  }
  return null;
}

interface ExportBannerProps {
  pairCount: number;
  canExport: boolean;
  onExport: () => Promise<void>;
  onDismiss: () => void;
}

export function ExportBanner({ pairCount, canExport, onExport, onDismiss }: ExportBannerProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleExport() {
    setStatus('sending');
    try {
      await onExport();
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
  }

  const tier = getCurrentTier(pairCount);
  const nextTier = getNextTier(pairCount);
  const tierMin = tier.min;
  const tierMax = nextTier?.min ?? tierMin + 50;
  const progressInTier = Math.min((pairCount - tierMin) / (tierMax - tierMin), 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${tier.badge}`}>
              {tier.label}
            </span>
            <span className={`text-[10px] tabular-nums font-medium ${tier.text}`}>{pairCount} kérdés</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{tier.sublabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canExport && status === 'idle' && (
            <button
              type="button"
              onClick={() => void handleExport()}
              className={`rounded-lg border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] transition hover:brightness-110 ${tier.badge}`}
            >
              {tier.exportLabel}
            </button>
          )}
          {canExport && status === 'sending' && (
            <span className="text-[10px] text-neutral-500">küldés...</span>
          )}
          {canExport && status === 'sent' && (
            <span className={`text-[10px] font-medium ${tier.text}`}>elküldve ✓</span>
          )}
          {status === 'error' && (
            <button
              type="button"
              onClick={() => void handleExport()}
              className="text-[10px] text-red-400/80 hover:text-red-300"
            >
              újra
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Bezár"
            className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-600 transition hover:text-neutral-400"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/6">
          <div
            className={`h-full rounded-full transition-all duration-700 ${tier.bar}`}
            style={{ width: `${Math.max(2, progressInTier * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-600">{tierMin}</span>
          {nextTier ? (
            <span className="text-[10px] text-neutral-600">
              még{' '}
              <span className={`font-medium ${tier.text}`}>{nextTier.min - pairCount}</span>
              {' '}→{' '}
              <span className="text-neutral-500">{nextTier.label}</span>
            </span>
          ) : (
            <span className={`text-[10px] font-medium ${tier.text}`}>max szint elérve</span>
          )}
          <span className="text-[10px] text-neutral-600">{tierMax}</span>
        </div>
      </div>
    </div>
  );
}
