// app/live/[slug]/page.tsx
import { getEventBySlug, getEventState } from '@/lib/live/events';
import { Suspense } from 'react';
import EventHeader from '@/components/live/EventHeader';
import PreLive from '@/components/live/PreLive';
import LiveRoom from '@/components/live/LiveRoom';
import Ended from '@/components/live/Ended';
import RoleSelector from '@/components/live/RoleSelector';
import { notFound } from 'next/navigation';

export default async function LiveEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return notFound();
  const state = getEventState(event);
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center">
      <EventHeader event={event} state={state} />
      {state === 'upcoming' && <PreLive event={event} />}
      {state === 'ended' && <Ended event={event} />}
      {state === 'live' && (
        <Suspense fallback={<div>Loading…</div>}>
          <RoleSelector event={event} />
        </Suspense>
      )}
    </main>
  );
}
