"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";

import { useSessionGuard } from "@/hooks/useSessionGuard";
import { createClient } from "@/lib/browser";

export default function Navigation() {
  const { session } = useSessionGuard();
  const userEmail = (session as any)?.user?.email || null;
  const userId = (session as any)?.user?.id || null;
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
        {/* Mobile Layout */}
        {userEmail ? (
          <div className="flex md:hidden flex-col items-center gap-4 w-full text-sm">
            <Link href="/" className="hover:text-lime-300 transition-colors">
              <img
                src="/img/logo.png"
                alt="Vállalhatatlan"
                className="h-16 md:h-10 w-auto"
              />
            </Link>

            <div className="flex flex-col items-center gap-3 w-full">
              <Link
                href={`/user/${userId}`}
                className="text-xs text-neutral-300 hover:text-lime-300 normal-case tracking-normal truncate max-w-full px-4 text-center transition-colors"
              >
                Üdv, {userEmail}
              </Link>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link
                  href="/reader"
                  className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
                >
                  Reader
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
            </div>
          </div>
        ) : (
          <div className="flex md:hidden w-full items-center justify-between gap-4 text-sm">
            <Link href="/" className="hover:text-lime-300 transition-colors">
              <img
                src="/img/logo.png"
                alt="Vállalhatatlan"
                className="h-10 w-auto"
              />
            </Link>

            <div className="flex items-center justify-end">
              <Link
                href="/auth?from=/reader"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 bg-black/20 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white hover:text-black transition-colors hover:bg-lime-400"
              >
                Klubtagoknak
                <KeyRound className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Desktop Layout: Horizontal */}
        <div className="hidden md:flex w-full items-center justify-between gap-6 text-sm uppercase tracking-[0.18em] text-neutral-300">
          <Link href="/" className="hover:text-lime-300 transition-colors">
            <img
              src="/img/logo.png"
              alt="Vállalhatatlan"
              className="h-10 md:px-6 w-auto"
            />
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-4 justify-end">
              <Link
                href={`/user/${userId}`}
                className="text-xs text-neutral-300 hover:text-lime-300 normal-case tracking-normal max-w-[220px] truncate transition-colors"
              >
                Üdv, {userEmail}
              </Link>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 bg-black/20 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white hover:text-black transition-colors hover:bg-lime-400"
              >
                Klubtagoknak
                <KeyRound className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </nav>


    </div>
  );
}
