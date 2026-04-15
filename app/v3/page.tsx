"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfessionalPanel from '@/components/ConfessionalPanel';
import { useSessionGuard } from '@/hooks/useSessionGuard';

export default function V3Page() {
  const router = useRouter();
  const { session, loading } = useSessionGuard();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session) {
      router.replace('/auth?from=/v3');
    }
  }, [loading, router, session]);

  if (loading || !session) {
    return null;
  }

  return <ConfessionalPanel />;
}
