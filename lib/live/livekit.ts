// lib/live/livekit.ts
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { Role } from './auth';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
export const LIVEKIT_URL = process.env.LIVEKIT_URL!;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  throw new Error('LiveKit env vars missing');
}

export async function createLiveKitToken({
  identity,
  displayName,
  role,
}: {
  identity: string;
  displayName: string;
  role: Role;
}): Promise<string> {
  const ROOM = 'nyitott-muhely';
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: displayName,
  });

  const isBroadcaster = role === 'broadcaster';
  at.addGrant({
    room: ROOM,
    roomJoin: true,
    canPublish: isBroadcaster,
    canPublishData: true,
    canSubscribe: !isBroadcaster,
    canPublishSources: isBroadcaster ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [],
    canUpdateOwnMetadata: true,
    hidden: false,
  });
  return await at.toJwt();
}
