'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'push_permission_dismissed';
const DISMISSED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface Props {
  accessToken: string | undefined;
}

export default function PushPermissionPrompt({ accessToken }: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show if:
    // - browser supports push
    // - permission not yet granted/denied
    // - not recently dismissed
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    if (Notification.permission !== 'default') return;
    if (!accessToken) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISSED_TTL_MS) return;

    // Small delay so it doesn't flash immediately on load
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [accessToken]);

  async function handleAccept() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('[PUSH] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
        setVisible(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ subscription }),
      });

      setVisible(false);
    } catch (err) {
      console.error('[PUSH] subscribe error:', err);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl flex flex-col gap-2">
      <p className="text-sm text-zinc-200 leading-snug">
        Értesítselek ha megszólalok?
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleDismiss}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1 rounded-lg transition-colors"
        >
          Nem
        </button>
        <button
          onClick={handleAccept}
          disabled={loading}
          className="text-xs bg-lime-400 text-black font-semibold px-3 py-1 rounded-lg hover:bg-lime-300 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Igen'}
        </button>
      </div>
    </div>
  );
}
