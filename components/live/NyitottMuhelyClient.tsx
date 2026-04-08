'use client';
// components/live/NyitottMuhelyClient.tsx
// Top-level client entry point: manages join state, renders gate or room
import { useState } from 'react';
import NyitottRoleGate from './NyitottRoleGate';
import ViewerView from './ViewerView';
import BroadcasterView from './BroadcasterView';
import type { Role } from '@/lib/live/auth';

type JoinedState = {
  role: Role;
  token: string;
  wsUrl: string;
  displayName: string;
};

export default function NyitottMuhelyClient() {
  const [joined, setJoined] = useState<JoinedState | null>(null);

  if (!joined) {
    return (
      <NyitottRoleGate
        onJoin={(role, token, wsUrl, displayName) =>
          setJoined({ role, token, wsUrl, displayName })
        }
      />
    );
  }

  if (joined.role === 'broadcaster') {
    return (
      <BroadcasterView
        token={joined.token}
        wsUrl={joined.wsUrl}
        displayName={joined.displayName}
      />
    );
  }

  return (
    <ViewerView
      token={joined.token}
      wsUrl={joined.wsUrl}
      displayName={joined.displayName}
    />
  );
}
