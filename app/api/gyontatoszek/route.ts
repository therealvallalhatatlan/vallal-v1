import { NextRequest } from 'next/server';
import { handleGyontatas } from '@/lib/gyontatoszek/service';

export const runtime = 'edge'; // for streaming

export async function POST(req: NextRequest) {
  const data = await req.json();
  if (!data || typeof data.confession !== 'string' || !data.confession.trim()) {
    return new Response('Missing or invalid confession', { status: 400 });
  }
  return handleGyontatas({ confession: data.confession });
}
