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
  const isClickable = copy.status === 'available' || (copy.status === 'reserved' && isReserved);

  return (
    <button
      onClick={() => onSelect(copy.copy_number)}
      disabled={!isClickable || isLoading}
      aria-label={`${copy.copy_number}. számú példány — ${getCopyStatusLabel(copy.status)}`}
      className={cn(
        'relative h-14 w-full overflow-hidden rounded border transition-all duration-150',
        'flex items-center justify-center',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400',

        // Available, no active reservation
        copy.status === 'available' && !isReserved && [
          'border-zinc-800 bg-zinc-900 text-zinc-300',
          'hover:border-lime-400/50 hover:bg-zinc-800 hover:text-lime-200',
          'hover:shadow-[0_0_10px_rgba(163,230,53,0.12)]',
          'cursor-pointer',
        ],

        // Available but I already hold a different reservation
        copy.status === 'available' && isReserved && !isSelected && [
          'border-zinc-900 bg-zinc-950 text-zinc-700',
          'cursor-default',
        ],

        // My selected copy
        isSelected && [
          'border-lime-400/50 bg-lime-950/50 text-lime-300',
          'shadow-[0_0_14px_rgba(163,230,53,0.18)]',
          'cursor-pointer',
        ],

        // Reserved by someone else
        copy.status === 'reserved' && !isSelected && [
          'border-amber-900/20 bg-amber-950/10 text-amber-900/40',
          'cursor-not-allowed',
        ],

        // Sold
        copy.status === 'sold' && [
          'border-zinc-900/60 bg-zinc-950 text-zinc-800',
          'cursor-not-allowed',
        ],

        isLoading && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Faint book-spine left-edge accent on available cards */}
      {copy.status === 'available' && !isSelected && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-lime-400/25 to-transparent"
        />
      )}
      <span
        className={cn(
          'relative z-10 font-mono text-xs font-bold tracking-widest',
          copy.status === 'sold' && 'line-through decoration-zinc-800',
        )}
      >
        {formatCopyNumber(copy.copy_number)}
      </span>
    </button>
  );
}
