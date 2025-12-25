"use client";

import Link from "next/link";

import { useSessionGuard } from "@/hooks/useSessionGuard";

export default function Navigation() {
  const { session } = useSessionGuard();
  const userEmail = (session as any)?.user?.email || null;

  return (
    <div className="relative">
      <nav className="max-w-3xl mx-auto py-6 md:px-0 px-6">
        <div className="flex w-full items-center justify-end gap-6 text-sm uppercase tracking-[0.18em] text-neutral-300">
        <Link href="/readers" className="hover:text-lime-300 transition-colors">
          <span className="text-lime-300">Vállalhatatlan </span>
          Online Reader
        </Link>

        {userEmail ? (
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-300 normal-case tracking-normal max-w-[220px] truncate">
              Üdv, {userEmail}
            </span>
            <Link
              href="/reader"
              className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
            >
              Tovább a readerre
            </Link>
          </div>
        ) : (
          <Link
            href="/auth?from=/reader"
            className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
          >
            Belépés
          </Link>
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
