// lib/live/events.ts
import { z } from 'zod';

export const eventSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  roomName: z.string(),
  startsAt: z.string(), // ISO string
  endsAt: z.string(),   // ISO string
  isPublished: z.boolean(),
});

export type Event = z.infer<typeof eventSchema>;

// Example event config array
export const events: Event[] = [
  {
    slug: 'nyitott-muhely-2',
    title: 'Book Launch Live Event',
    description: 'Join us for the live launch of our new book!',
    roomName: 'Nyitott Múhely',
    startsAt: '2026-04-07T10:50:00.000Z',
    endsAt: '2026-04-07T20:00:00.000Z',
    isPublished: true,
  },
  // Add more events as needed
];

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug && e.isPublished);
}

export type EventState = 'upcoming' | 'live' | 'ended';

export function getEventState(event: Event, now: Date = new Date()): EventState {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
}
