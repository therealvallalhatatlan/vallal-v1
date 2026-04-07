// components/live/AdminPanel.tsx
import { Event } from '@/lib/live/events';

export default function AdminPanel({ event }: { event: Event }) {
  // Placeholder for participant list and moderation controls
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="font-bold mb-2">Admin Controls</div>
      <div className="text-sm text-gray-400 mb-2">Moderation features coming soon.</div>
      {/* TODO: List participants, add mute/remove controls */}
      <div className="text-xs text-gray-500">Room: {event.roomName}</div>
    </div>
  );
}
