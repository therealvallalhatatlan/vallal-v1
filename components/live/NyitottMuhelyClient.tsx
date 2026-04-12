'use client';
// components/live/NyitottMuhelyClient.tsx
// Top-level client entry point: manages join state, renders gate or room
import { useEffect, useState } from 'react';
import NyitottRoleGate from './NyitottRoleGate';
import ViewerView from './ViewerView';
import BroadcasterView from './BroadcasterView';
import LiveChat from './LiveChat';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Role } from '@/lib/live/auth';

type JoinedState = {
  role: Role;
  token: string;
  wsUrl: string;
  displayName: string;
};

export default function NyitottMuhelyClient() {
  const [joined, setJoined] = useState<JoinedState | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateLayoutMode = () => setIsDesktop(window.innerWidth >= 768);
    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, []);

  if (!joined) {
    return (
      <NyitottRoleGate
        onJoin={(role, token, wsUrl, displayName) =>
          setJoined({ role, token, wsUrl, displayName })
        }
      />
    );
  }

  const mainView = joined.role === 'broadcaster' ? (
    <BroadcasterView
      token={joined.token}
      wsUrl={joined.wsUrl}
      displayName={joined.displayName}
    />
  ) : (
    <ViewerView
      token={joined.token}
      wsUrl={joined.wsUrl}
      displayName={joined.displayName}
    />
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 md:px-5 py-3 md:py-5">
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-4 lg:gap-6">
        <div className="min-w-0">{mainView}</div>

        {isDesktop ? (
          <aside className="hidden md:block h-[calc(100vh-3rem)] sticky top-4">
            <LiveChat
              displayName={joined.displayName}
              role={joined.role}
              roomId="nyitott-muhely"
              active={true}
            />
          </aside>
        ) : null}
      </div>

      {!isDesktop ? (
        <div className="md:hidden fixed bottom-4 right-4 z-40">
          <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative rounded-full bg-lime-500 text-black px-4 py-3 text-sm font-bold shadow-lg"
              >
                Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" forceMount className="h-[78vh] bg-black text-white border-gray-800 p-0">
              <LiveChat
                displayName={joined.displayName}
                role={joined.role}
                roomId="nyitott-muhely"
                compact={true}
                onUnreadChange={setUnreadCount}
                active={mobileChatOpen}
              />
            </SheetContent>
          </Sheet>
        </div>
      ) : null}
    </div>
  );
}
