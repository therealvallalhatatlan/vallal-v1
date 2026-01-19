'use client';

import { useEffect, useState } from 'react';
import { useSessionGuard } from './useSessionGuard';

export function useReaderAccess() {
  const { session, loading: sessionLoading } = useSessionGuard();
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    async function checkAccess() {
      try {
        setError(null);
        const res = await fetch('/api/reader-access', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
        const { data } = await res.json();

        setHasAccess(data?.hasAccess === true);
      } catch (err) {
        console.error('[useReaderAccess] check failed', err);
        setError(err instanceof Error ? err.message : String(err));
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [session, sessionLoading]);

  return { hasAccess, loading, error, session };
}