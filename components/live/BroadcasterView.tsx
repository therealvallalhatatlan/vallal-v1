'use client';
// components/live/BroadcasterView.tsx
// Broadcaster: publishes camera+mic, shows self-preview + LIVE badge. No remote feeds.
import '@livekit/components-styles';
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
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
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const mediaTracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });
  const cameraTrack = mediaTracks.find(
    (track) =>
      track.participant.identity === localParticipant?.identity &&
      track.source === Track.Source.Camera
  );
  const otherBroadcasters = remoteParticipants.filter(
    participant => participant.identity.startsWith('broadcaster-')
  );
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  async function toggleCamera() {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await localParticipant?.setCameraEnabled(true, { facingMode: next });
  }

  const isLive = connectionState === ConnectionState.Connected;

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 px-4 flex flex-col items-center gap-6">
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

      {otherBroadcasters.length > 0 && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-400">
              Tobbi kozvetito
            </h3>
            <span className="text-xs text-gray-500">
              {otherBroadcasters.length} aktiv stream
            </span>
          </div>

          <div className={`grid gap-4 ${otherBroadcasters.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {otherBroadcasters.map((participant) => {
              const remoteCameraTrack = mediaTracks.find(
                (track) =>
                  track.participant.identity === participant.identity &&
                  track.source === Track.Source.Camera
              );
              const remoteAudioTrack = mediaTracks.find(
                (track) =>
                  track.participant.identity === participant.identity &&
                  track.source === Track.Source.Microphone
              );

              return (
                <div key={participant.identity} className="relative overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
                  <div className="aspect-video w-full bg-gray-900">
                    {remoteCameraTrack ? (
                      <VideoTrack trackRef={remoteCameraTrack} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        Nincs video
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-xs text-white">
                    {participant.name || participant.identity}
                  </div>

                  {/* Play all remote broadcaster microphones to mimic Zoom-like mixed audio. */}
                  {remoteAudioTrack && <AudioTrack trackRef={remoteAudioTrack} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      connectOptions={{ autoSubscribe: true }}
    >
      <BroadcasterInner displayName={displayName} />
    </LiveKitRoom>
  );
}
