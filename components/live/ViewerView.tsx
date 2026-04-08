'use client';
// components/live/ViewerView.tsx
// Viewer: sees all broadcaster video tiles; only one broadcaster's audio plays at a time.
import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useRemoteParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';

type Props = {
  token: string;
  wsUrl: string;
  displayName: string;
};

function ViewerInner() {
  const remoteParticipants = useRemoteParticipants();
  const broadcasters = remoteParticipants.filter(p =>
    p.identity.startsWith('broadcaster-')
  );

  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);

  // Auto-select first broadcaster when none is active
  useEffect(() => {
    if (!activeIdentity && broadcasters.length > 0) {
      setActiveIdentity(broadcasters[0].identity);
    }
    // If active broadcaster left, switch to first remaining
    if (
      activeIdentity &&
      !broadcasters.find(p => p.identity === activeIdentity) &&
      broadcasters.length > 0
    ) {
      setActiveIdentity(broadcasters[0].identity);
    }
  }, [broadcasters, activeIdentity]);

  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  if (broadcasters.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-16 flex flex-col items-center gap-4 px-4">
        <div className="text-xl font-semibold">Nincs aktív közvetítő</div>
        <div className="text-gray-400 text-sm">Kérjük várj, hamarosan kezdődik!</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4">
      <div
        className={`grid gap-4 ${
          broadcasters.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        }`}
      >
        {broadcasters.map(participant => {
          const isActive = participant.identity === activeIdentity;
          const videoTrack = allTracks.find(
            t =>
              t.participant.identity === participant.identity &&
              t.source === Track.Source.Camera
          );
          const audioTrack = allTracks.find(
            t =>
              t.participant.identity === participant.identity &&
              t.source === Track.Source.Microphone
          );

          return (
            <div
              key={participant.identity}
              onClick={() => setActiveIdentity(participant.identity)}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                isActive ? 'border-white' : 'border-transparent hover:border-gray-600'
              }`}
            >
              <div className="aspect-video bg-gray-900 w-full">
                {videoTrack ? (
                  <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    Nincs videó
                  </div>
                )}
              </div>

              {/* Audio: only render for active broadcaster */}
              {isActive && audioTrack && <AudioTrack trackRef={audioTrack} />}

              {/* Name + active indicator */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  {participant.name || participant.identity}
                </span>
                {isActive && (
                  <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded">
                    HANGOS
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {broadcasters.length > 1 && (
        <p className="text-gray-500 text-xs text-center mt-4">
          Kattints egy közvetítőre a hang kiválasztásához.
        </p>
      )}
    </div>
  );
}

export default function ViewerView({ token, wsUrl, displayName }: Props) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={false}
      audio={false}
      connectOptions={{ autoSubscribe: true }}
    >
      <h1 className="text-2xl font-bold mt-8 mb-2">Nyitott Műhely — Néző: {displayName}</h1>
      <ViewerInner />
    </LiveKitRoom>
  );
}
