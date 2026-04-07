// lib/live/livekit.ts
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { Role } from './auth';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL = process.env.LIVEKIT_URL!;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  throw new Error('LiveKit env vars missing');
}

export async function createLiveKitToken({
  roomName,
  identity,
  displayName,
  role,
}: {
  roomName: string;
  identity: string;
  displayName: string;
  role: Role;
}): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: displayName,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: role === 'participant' || role === 'admin',
    canPublishData: true,
    canSubscribe: true,
    canPublishSources: role === 'participant' || role === 'admin' ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [],
    canUpdateOwnMetadata: true,
    hidden: false,
    roomAdmin: role === 'admin',
  });
  return await at.toJwt();
}

export { LIVEKIT_URL };
