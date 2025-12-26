'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/browser';

const supabase = createClient();

export function useSessionGuard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function fetchSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!isActive) return;

      if (error) {
        console.warn('[useSessionGuard] getSession error', error.message);
      }

      setSession(data?.session ?? null);
      setLoading(false);
    }

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isActive) return;
      setSession(newSession);
    });

    return () => {
      isActive = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return { session, loading };
}