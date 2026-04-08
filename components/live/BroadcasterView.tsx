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

type Props = {
  token: string;
  wsUrl: string;
  displayName: string;
};

function BroadcasterInner({ displayName }: { displayName: string }) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const cameraTrack = cameraTracks.find(t => t.participant.identity === localParticipant?.identity);

  const isLive = connectionState === ConnectionState.Connected;

  return (
    <div className="w-full max-w-lg mx-auto mt-10 px-4 flex flex-col items-center gap-6">
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

      <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {cameraTrack ? (
          <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Kamera indítása…
          </div>
        )}
      </div>

      <p className="text-gray-400 text-sm text-center">
        A közvetítésed éló. A nézők látják a videódat.
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
      video={true}
      audio={true}
      connectOptions={{ autoSubscribe: false }}
    >
      <BroadcasterInner displayName={displayName} />
    </LiveKitRoom>
  );
}
