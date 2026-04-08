// app/api/livekit/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createLiveKitToken, LIVEKIT_URL } from '@/lib/live/livekit';
import {
  sanitizeDisplayName,
  generateIdentity,
  validateRoleAccess,
  type Role,
} from '@/lib/live/auth';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { role, displayName, broadcasterKey } = body as {
    role: unknown;
    displayName: unknown;
    broadcasterKey?: unknown;
  };

  if (role !== 'viewer' && role !== 'broadcaster') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const typedRole = role as Role;
  const rawName = typeof displayName === 'string' ? displayName : '';
  const cleanName = sanitizeDisplayName(rawName);

  if (!cleanName) {
    return NextResponse.json({ error: 'Display name required' }, { status: 400 });
  }

  const key = typeof broadcasterKey === 'string' ? broadcasterKey : undefined;

  if (!validateRoleAccess(typedRole, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = generateIdentity(typedRole);
  const token = await createLiveKitToken({ identity, displayName: cleanName, role: typedRole });

  return NextResponse.json({ token, wsUrl: LIVEKIT_URL });
}
