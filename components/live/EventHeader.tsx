// components/live/EventHeader.tsx
import { Event, EventState } from '@/lib/live/events';

export default function EventHeader({ event, state }: { event: Event; state: EventState }) {
  return (
    <header className="w-full max-w-2xl py-8 text-center">
      <h1 className="text-3xl md:text-5xl font-bold mb-2">{event.title}</h1>
      <p className="text-lg md:text-xl mb-2 text-gray-300">{event.description}</p>
      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          state === 'live' ? 'bg-green-600' : state === 'upcoming' ? 'bg-yellow-600' : 'bg-gray-700'
        }`}>{state === 'live' ? 'LIVE' : state === 'upcoming' ? 'Upcoming' : 'Ended'}</span>
      </div>
      <p className="text-sm text-gray-400">
        {state === 'upcoming' && 'The event will start soon.'}
        {state === 'live' && 'The event is live!'}
        {state === 'ended' && 'This event has ended.'}
      </p>
    </header>
  );
}
