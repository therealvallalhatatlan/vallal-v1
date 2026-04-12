'use client';
// components/live/BroadcasterView.tsx
// Broadcaster: publishes camera+mic, shows self-preview + LIVE badge. No remote feeds.
import '@livekit/components-styles';
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoTrack,
  useTracks,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { useState } from 'react';
import ParticipantCounts from './ParticipantCounts';

type Props = {
  token: string;
  wsUrl: string;
  displayName: string;
};

type FacingMode = 'environment' | 'user';

function BroadcasterInner({ displayName }: { displayName: string }) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const cameraTrack = cameraTracks.find(t => t.participant.identity === localParticipant?.identity);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  async function toggleCamera() {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await localParticipant?.setCameraEnabled(true, { facingMode: next });
  }

  const isLive = connectionState === ConnectionState.Connected;

  return (
    <div className="w-full max-w-lg mx-auto mt-10 px-4 flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
              isLive ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {isLive ? 'ÉLŐ' : 'Csatlakozás…'}
          </span>
        </div>
        {isLive && <ParticipantCounts />}
      </div>

      <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {cameraTrack ? (
          <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Kamera indítása…
          </div>
        )}
        <button
          onClick={toggleCamera}
          className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-sm font-semibold px-3 py-1.5 rounded-full transition"
          title={facingMode === 'environment' ? 'Váltás előlap kamerára' : 'Váltás hátsó kamerára'}
        >
          ↺ {facingMode === 'environment' ? 'Előlap' : 'Hátsó'}
        </button>
      </div>

      <p className="text-gray-400 text-sm text-center">
        A közvetítésed élő. A nézők látják a videódat.
      </p>
    </div>
  );
}

export default function BroadcasterView({ token, wsUrl, displayName }: Props) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={{ facingMode: 'environment' }}
      audio={true}
      connectOptions={{ autoSubscribe: false }}
    >
      <BroadcasterInner displayName={displayName} />
    </LiveKitRoom>
  );
}
