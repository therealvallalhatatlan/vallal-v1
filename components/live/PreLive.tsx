// components/live/PreLive.tsx
'use client';
import { useMemo } from 'react';
import { Event } from '../../lib/live/events';

export default function PreLive({ event }: { event: Event }) {
  const start = useMemo(() => new Date(event.startsAt), [event.startsAt]);
  const formatted = useMemo(
    () =>
      start.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }),
    [start]
  );
  return (
    <section className="flex flex-col items-center mt-8">
      <div className="text-2xl font-semibold mb-2">Event starts soon</div>
      <div className="text-lg text-gray-400 mb-4">{formatted}</div>
      {/* TODO: Add countdown timer if desired */}
    </section>
  );
}
