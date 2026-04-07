// components/live/LiveRoom.tsx
'use client';
import { useEffect, useState } from 'react';
import { Event } from '../../lib/live/events';
import { LIVEKIT_URL } from '@/lib/live/livekit';
import { LiveKitRoom } from '@livekit/components-react';
import { VideoConference } from '@livekit/components-react/prefabs';
import '@livekit/components-styles';
import AdminPanel from './AdminPanel';

export default function LiveRoom({
  event,
  role,
  displayName,
  keyProp,
}: {
  event: Event;
  role: 'viewer' | 'participant' | 'admin';
  displayName: string;
  keyProp: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      setError(null);
      setToken(null);
      setIdentity(null);
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: event.slug,
            role,
            displayName,
            key: keyProp,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get token');
        setToken(data.token);
        setIdentity(data.identity);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.slug, role, displayName, keyProp]);

  if (error) {
    return <div className="text-red-500 mt-8">Error: {error}</div>;
  }
  if (!token || !identity) {
    return <div className="mt-8">Joining room…</div>;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connectOptions={{ autoSubscribe: true }}
      // Use identity as a key to force re-mount on join
      key={identity}
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6 mt-8">
        <div className="flex-1 min-w-0">
          <VideoConference
            chatMessageFormatter={() => null} // Hide default chat
            style={{ background: 'transparent' }}
          />
        </div>
        <div className="w-full md:w-64">
          {/* Chat placeholder */}
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <div className="font-semibold mb-2">Chat (coming soon)</div>
            <div className="text-gray-500 text-sm">Chat will be available in a future update.</div>
          </div>
          {role === 'admin' && <AdminPanel event={event} />}
        </div>
      </div>
    </LiveKitRoom>
  );
}
