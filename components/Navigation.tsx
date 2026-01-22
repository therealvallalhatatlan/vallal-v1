"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useSessionGuard } from "@/hooks/useSessionGuard";
import { createClient } from "@/lib/browser";

export default function Navigation() {
  const { session } = useSessionGuard();
  const userEmail = (session as any)?.user?.email || null;
  const router = useRouter();
  const supabase = createClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/auth");
    setIsLoggingOut(false);
  };

  return (
    <div className="relative">
      <nav className="max-w-3xl mx-auto py-6 md:px-0 px-6">
        <div className="flex w-full items-center justify-between gap-6 text-sm uppercase tracking-[0.18em] text-neutral-300">
          <Link href="/readers" className="hover:text-lime-300 transition-colors">
            <img
              src="/img/logo.png"
              alt="Vállalhatatlan"
              className="h-10 md:px-6 w-auto"
            />
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-4 justify-end">
              <span className="text-xs text-neutral-300 normal-case tracking-normal max-w-[220px] truncate">
                Üdv, {userEmail}
              </span>
              <Link
                href="/reader"
                className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
              >
                Tovább a readerre
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Kijelentkezés"
                className="text-neutral-400 hover:text-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <Link
                href="/auth?from=/reader"
                className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
              >
                Belépés
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 -bottom-2 h-8"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <div className="w-full h-full bg-white/5 dark:bg-black/20" />
      </div>
    </div>
  );
}
