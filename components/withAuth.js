'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSessionGuard } from '@/hooks/useSessionGuard';

function withAuth(WrappedComponent) {
  function WithAuthComponent(props) {
    const router = useRouter();
    const { session, loading } = useSessionGuard();

    useEffect(() => {
      if (!loading && !session) {
        router.replace('/auth');
      }
    }, [loading, session, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!session) {
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithAuthComponent.displayName = `withAuth(${wrappedName})`;

  return WithAuthComponent;
}

export default withAuth;
