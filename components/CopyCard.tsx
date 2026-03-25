'use client';

import type { BookCopy } from '@/types/reservations';
import { formatCopyNumber, getCopyStatusLabel } from '@/lib/copyFormatting';
import { cn } from '@/lib/utils';

interface CopyCardProps {
  copy: BookCopy;
  isSelected: boolean;
  isReserved: boolean;
  isLoading: boolean;
  onSelect: (copyNumber: number) => void;
}

export function CopyCard({ copy, isSelected, isReserved, isLoading, onSelect }: CopyCardProps) {
  // Clickable: available OR reserved by this session (for cancel)
  const isClickable = (copy.status === 'available') || (copy.status === 'reserved' && isReserved);
  const statusLabel = getCopyStatusLabel(copy.status);

  return (
    <button
      onClick={() => onSelect(copy.copy_number)}
      disabled={!isClickable || isLoading}
      aria-label={`Példány száma ${copy.copy_number}`}
      title={statusLabel}
      className={cn(
        'relative h-24 w-full rounded-xs border-t-1 border-l-1 border-b-4 border-r-4 border-neutral-400 hover:border-lime-400 transition-all duration-300',
        'flex items-center justify-center font-mono text-base',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',

        copy.status === 'available' && !isReserved && [
          'border-neutral-400/40 bg-black/80 text-slate-100',
          'hover:border-lime-400 hover:bg-slate-800 hover:shadow-[0_0_16px_rgba(132,204,22,0.3)]',
          'cursor-pointer',
        ],

        isSelected && [
          'border-emerald-300 bg-emerald-500/15 text-emerald-100',
          'shadow-[0_0_24px_rgba(16,185,129,0.4)]',
          'animate-pulse',
        ],

        copy.status === 'reserved' && !isReserved && [
          'border-yellow-500/50 bg-yellow-950/35 text-yellow-100',
          'cursor-not-allowed',
        ],

        copy.status === 'sold' && [
          'border-destructive/60 bg-destructive/20 text-destructive/60',
          'line-through',
          'cursor-not-allowed',
        ],

        isLoading && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-xl font-black tracking-tighter">#{formatCopyNumber(copy.copy_number)}</span>
        <span className="text-xs uppercase tracking-wide text-slate-400">{statusLabel}</span>
      </div>
    </button>
  );
}
