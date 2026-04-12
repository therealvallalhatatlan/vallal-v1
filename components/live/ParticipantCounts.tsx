'use client';
// components/live/ParticipantCounts.tsx
// Reusable count badge usable inside any LiveKitRoom context.
import { useRemoteParticipants, useLocalParticipant } from '@livekit/components-react';

export function useParticipantCounts() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const all = localParticipant
    ? [localParticipant, ...remoteParticipants]
    : remoteParticipants;

  const broadcasters = all.filter(p => p.identity.startsWith('broadcaster-')).length;
  const viewers = all.filter(p => p.identity.startsWith('viewer-')).length;

  return { broadcasters, viewers, total: broadcasters + viewers };
}

export default function ParticipantCounts() {
  const { broadcasters, viewers } = useParticipantCounts();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-semibold">{broadcasters}</span>
        <span className="text-gray-400">közvetítő</span>
      </span>
      <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
        <span className="font-semibold">{viewers}</span>
        <span className="text-gray-400">néző</span>
      </span>
    </div>
  );
}
