// app/api/livekit/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug } from '@/lib/live/events';
import { sanitizeDisplayName, generateIdentity, validateRoleAccess, Role } from '@/lib/live/auth';
import { createLiveKitToken } from '@/lib/live/livekit';

export async function POST(req: NextRequest) {
  const { slug, role, displayName, key } = await req.json();
  if (!slug || !role || !displayName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const event = getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  if (!validateRoleAccess(role as Role, key)) {
    return NextResponse.json({ error: 'Invalid access key' }, { status: 403 });
  }
  const cleanName = sanitizeDisplayName(displayName);
  const identity = generateIdentity(slug, role, cleanName);
  const token = createLiveKitToken({
    roomName: event.roomName,
    identity,
    displayName: cleanName,
    role: role as Role,
  });
  return NextResponse.json({ token, identity });
}
