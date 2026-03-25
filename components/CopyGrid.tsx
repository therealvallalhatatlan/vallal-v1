'use client';

import type { BookCopy } from '@/types/reservations';
import { CopyCard } from './CopyCard';

interface CopyGridProps {
  copies: BookCopy[];
  reservedCopy: BookCopy | null;
  loading: boolean;
  onSelectCopy: (copyNumber: number) => void;
}

export function CopyGrid({ copies, reservedCopy, loading, onSelectCopy }: CopyGridProps) {
  if (copies.length === 0) {
    return <div className="py-8 text-center text-foreground/60">Nincsenek elérhető példányok</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-2 md:grid-cols-5 md:gap-2">
      {copies.map((copy) => (
        <CopyCard
          key={copy.id}
          copy={copy}
          isSelected={reservedCopy?.copy_number === copy.copy_number}
          isReserved={!!reservedCopy}
          isLoading={loading}
          onSelect={onSelectCopy}
        />
      ))}
    </div>
  );
}
