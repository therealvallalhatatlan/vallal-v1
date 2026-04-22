'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/browser';

export function useSessionGuard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let isActive = true;
    let unsubscribe = null;

    async function fetchSession() {
      try {
        const { data, error } = await supabaseRef.current.auth.getSession();
        if (!isActive) return;

        if (error) {
          console.error('[useSessionGuard] getSession failed:', error.message);
          setError(error.message);
        } else {
          console.log('[useSessionGuard] session loaded:', data?.session ? 'authenticated' : 'no session');
        }

        setSession(data?.session ?? null);
      } catch (err) {
        if (isActive) {
          console.error('[useSessionGuard] fetchSession exception:', err);
          setError(err.message);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchSession();

    const { data } = supabaseRef.current.auth.onAuthStateChange((event, newSession) => {
      if (!isActive) return;
      console.log('[useSessionGuard] auth state changed:', event, newSession ? 'authenticated' : 'no session');
      setSession(newSession);
    });

    unsubscribe = data?.subscription?.unsubscribe;

    return () => {
      isActive = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return { session, loading, error };
}