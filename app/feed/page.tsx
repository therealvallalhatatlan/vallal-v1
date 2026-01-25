"use client";

import Feed from "@/components/Feed";
import Navigation from "@/components/Navigation";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FeedPage() {
  const router = useRouter();
  const { session, loading } = useSessionGuard() as {
    session: { user?: { id?: string; email?: string } } | null;
    loading: boolean;
  };

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Betöltés...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <Feed />
    </div>
  );
}
