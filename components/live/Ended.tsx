// components/live/Ended.tsx
import { Event } from '@/lib/live/events';

export default function Ended({ event }: { event: Event }) {
  return (
    <section className="flex flex-col items-center mt-8">
      <div className="text-2xl font-semibold mb-2">The live event has ended</div>
      <div className="text-lg text-gray-400 mb-4">Thank you for joining {event.title}.</div>
    </section>
  );
}
