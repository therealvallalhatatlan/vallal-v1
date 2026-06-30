"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";

import { useSessionGuard } from "@/hooks/useSessionGuard";
import { createClient } from "@/lib/browser";

const SOCIAL_LINKS = [
  { label: "Email", href: "mailto:therealvallalhatatlan@gmail.com" },
  { label: "Facebook", href: "https://www.facebook.com/vallalhatatlan2000" },
  { label: "Reddit", href: "https://reddit.com/r/vallalhatatlan" },
  { label: "Substack", href: "https://vallalhatatlan.substack.com/" },
];

export default function Navigation() {
  const { session, error } = useSessionGuard();
  const [isClient, setIsClient] = useState(false);
  const userEmail = (session as any)?.user?.email || null;
  const userId = (session as any)?.user?.id || null;
  const router = useRouter();
  const supabase = createClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (error) {
    console.error("[Navigation] Auth error:", error);
  }

  if (!isClient) {
    return (
      <div className="relative">
        <nav className="py-4 px-4 md:px-8 border-b border-white/10 font-mono">
          <div className="flex items-center justify-between">
            <a href="/">
              <img src="/img/logo.png" alt="Vállalhatatlan" className="h-10 w-auto" />
            </a>
          </div>
        </nav>
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/auth");
    setIsLoggingOut(false);
  };

  return (
    <div className="relative">
      <nav className="py-4 px-4 md:px-8 border-b border-white/10 font-mono text-gray-200">

        {/* ── Mobile Layout ── */}
        <div className="flex md:hidden items-center justify-between gap-4 text-sm">
          <Link href="/" className="hover:opacity-80 transition-opacity ml-20">
            <img src="/img/logo.png" alt="Vállalhatatlan" className="h-10 w-auto" />
          </Link>

          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/shop"
                className="border border-white/30 px-3 py-1.5 text-xs font-bold tracking-widest text-lime-400 hover:border-lime-400 hover:bg-lime-400/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/halozat"
                className="border border-white/30 px-3 py-1.5 text-xs font-semibold tracking-widest text-white hover:border-lime-400 hover:text-lime-400 transition-colors"
              >
                Hálózat
              </Link>
              <Link
                href="/reader"
                className="border border-lime-500/60 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold tracking-widest text-lime-400 hover:bg-lime-500/20 transition-colors"
              >
                Reader
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Kijelentkezés"
                className="text-gray-500 hover:text-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/shop"
                className="border border-white/30 px-3 py-1.5 text-xs font-bold tracking-widest text-lime-400 hover:border-lime-400 hover:bg-lime-400/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/auth?from=/reader"
                className="inline-flex items-center gap-1.5 border border-white/30 px-3 py-1.5 text-xs font-bold tracking-widest text-white hover:border-lime-400 hover:text-lime-400 transition-colors"
              >
                Klubtagoknak
                <KeyRound className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Desktop Layout: Logo | Auth | Social ── */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-6 text-xs uppercase tracking-[0.18em]">

          {/* Left: Logo — shifted right to clear the corner crack */}
          <Link href="/" className="hover:opacity-80 transition-opacity ml-36">
            <img src="/img/logo.png" alt="Vállalhatatlan" className="h-10 w-auto" />
          </Link>

          {/* Center: Auth / KLUBTAGOKNAK */}
          {userEmail ? (
            <div className="flex items-center gap-4">
              <Link
                href={`/user/${userId}`}
                className="text-xs normal-case tracking-normal text-gray-400 hover:text-lime-300 max-w-[200px] truncate transition-colors"
              >
                Üdv, {userEmail}
              </Link>
              <Link
                href="/halozat"
                className="border border-white/30 px-4 py-2 font-semibold tracking-widest text-white hover:border-lime-400 hover:text-lime-400 transition-colors"
              >
                Hálózat
              </Link>
              <Link
                href="/shop"
                className="border border-white/30 px-4 py-2 font-semibold tracking-widest text-lime-400 hover:border-lime-400 hover:bg-lime-400/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/reader"
                className="border border-lime-500/60 bg-lime-500/10 px-4 py-2 font-semibold tracking-widest text-lime-400 hover:bg-lime-500/20 hover:border-lime-400 transition-colors"
              >
                Reader
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Kijelentkezés"
                className="text-gray-500 hover:text-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 font-bold tracking-[0.25em] text-lime-400 hover:border-lime-400 hover:bg-lime-400/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/auth?from=/reader"
                className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 font-bold tracking-[0.25em] text-white hover:border-lime-400 hover:text-lime-400 transition-colors"
              >
                Klubtagoknak
                <KeyRound className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Right: Social links */}
          <div className="flex items-center justify-end gap-5 text-gray-400 normal-case tracking-normal">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("mailto") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="hover:text-lime-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

        </div>
      </nav>
    </div>
  );
}
