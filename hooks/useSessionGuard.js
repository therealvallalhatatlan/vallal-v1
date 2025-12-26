'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/browser';

export function useSessionGuard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let isActive = true;

    async function fetchSession() {
      const { data, error } = await supabaseRef.current.auth.getSession();
      if (!isActive) return;

      if (error) {
        console.warn('[useSessionGuard] getSession error', error.message);
      }

      setSession(data?.session ?? null);
      setLoading(false);
    }

    fetchSession();

    const { data: listener } = supabaseRef.current.auth.onAuthStateChange((_event, newSession) => {
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