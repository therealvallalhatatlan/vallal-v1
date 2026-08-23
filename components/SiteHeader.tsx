"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { createClient } from "@/lib/browser";

const menuItems = [
  {
    href: "/konyv",
    label: "ARCHÍVUM",
    description: "Meg sem történt történetek.",
  },
  {
    href: "/halozat",
    label: "HÁLÓZAT",
    description: "Map, spots, drops and live signals.",
  },
  {
    href: "/lab",
    label: "LAB",
    description: "Experiments, prototypes and works in progress.",
  },
  {
    href: "/shop",
    label: "SHOP",
    description: "Books, objects, editions and other artifacts.",
  },
  {
    href: "/tamogatas",
    label: "SUPPORT",
    description: "Help keep the network alive and moving.",
  },
];

type AuthUser = {
  email?: string | null;
  user_metadata?: {
    avatar_url?: string | null;
    picture?: string | null;
    full_name?: string | null;
    name?: string | null;
  };
};

export default function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user as AuthUser | null);
      }
    };

    void loadUser();

    const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(
  (_event: AuthChangeEvent, session: Session | null) => {
    if (!mounted) return;

    setUser(session?.user ? (session.user as AuthUser) : null);
  }
);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "NODE";

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Logo */}
      <Link href="/" className="group">
        <h1
          className="text-lg font-bold italic text-zinc-100 transition-colors group-hover:text-lime-200"
          style={{ fontFamily: "var(--font-logo)" }}
        >
          Vállalhatatlan
        </h1>
      </Link>

      {/* Right side */}
      <div
        className="flex items-center gap-4 text-[11px] text-lime-100"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        {/* Network status */}
        <span className="hidden items-center sm:inline-flex">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
          HALOZAT: ONLINE
        </span>

        {/* Logged-in avatar */}
        {user && (
          <Link
            href="/dashboard"
            aria-label="Open dashboard"
            className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 transition-all hover:border-lime-400/70 hover:shadow-[0_0_12px_rgba(163,230,53,0.15)]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0"
              />
            ) : (
              <span className="text-xs font-bold text-lime-200">
                {avatarLetter}
              </span>
            )}

            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-zinc-950 bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
          </Link>
        )}

        {/* Logged-out login */}
        {!user && (
          <Link
            href="/auth?from=%2F&next=%2F"
            className="hidden text-[10px] tracking-[0.16em] text-zinc-400 transition-colors hover:text-lime-200 sm:block"
          >
            LOGIN
          </Link>
        )}

        {/* Hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation"
              className="group inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-950 text-zinc-300 transition-all hover:border-lime-400/70 hover:bg-lime-400/5 hover:text-lime-200"
            >
              <Menu className="h-5 w-5 transition-transform group-hover:scale-105" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="z-[100] flex w-[min(25rem,92vw)] flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-[-20px_0_60px_rgba(0,0,0,0.55)]"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {/* Background atmosphere */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(163,230,53,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(163,230,53,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.06),transparent_35%)]" />
            </div>

            {/* Header */}
            <SheetHeader className="relative border-b border-zinc-800 px-6 pb-5 pt-7 pr-14 text-left">
              <SheetTitle className="text-[11px] font-bold tracking-[0.22em] text-lime-300">
                [ ACCESS MENU ]
              </SheetTitle>

              <SheetDescription className="mt-2 text-xs tracking-[0.08em] text-zinc-500">
                Vállalhatatlan Network
              </SheetDescription>
            </SheetHeader>

            {/* Auth / Profile */}
            <div className="relative border-b border-zinc-800 px-5 py-5">
              {user ? (
                <SheetClose asChild>
                    <Link
                      href="/dashboard"
                    className="group flex w-full items-center gap-4 border border-zinc-800 bg-zinc-900/30 px-5 py-4 transition-all hover:border-lime-400/50 hover:bg-lime-400/[0.035]"
                  >
                    {/* Avatar */}
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0"
                        />
                      ) : (
                        <span className="text-sm font-bold text-lime-200">
                          {avatarLetter}
                        </span>
                      )}

                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-zinc-950 bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
                    </div>

                    {/* User information */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold tracking-[0.16em] text-lime-200">
                        {displayName}
                      </div>

                      {user.email && (
                        <div className="mt-1 truncate text-[10px] tracking-[0.05em] text-zinc-500">
                          {user.email}
                        </div>
                      )}

                      <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                        Open profile
                      </div>
                    </div>

                    <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-lime-300" />
                  </Link>
                </SheetClose>
              ) : (
                <SheetClose asChild>
                  <Link
                    href="/auth?from=%2F&next=%2F"
                    className="group flex w-full items-center justify-between border border-lime-400/50 bg-lime-400/[0.035] px-5 py-4 text-lime-200 transition-all hover:border-lime-300 hover:bg-lime-400/10 hover:shadow-[0_0_24px_rgba(163,230,53,0.08)]"
                  >
                    <div>
                      <div className="text-xs font-bold tracking-[0.2em]">
                        LOGIN
                      </div>

                      <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                        Belépés a hálózatba
                      </div>
                    </div>

                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </SheetClose>
              )}
            </div>

            {/* Navigation */}
            <nav
              aria-label="Main navigation"
              className="relative flex-1 overflow-y-auto px-4 py-5"
            >
              <ul className="space-y-1">
                {menuItems.map((item, index) => (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        className="group relative block border border-transparent px-4 py-4 transition-all hover:border-zinc-700 hover:bg-lime-400/[0.025]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold tracking-[0.14em] text-zinc-200 transition-colors group-hover:text-lime-200">
                            <span className="mr-3 text-zinc-600 group-hover:text-lime-400/70">
                              [{String(index + 1).padStart(2, "0")}]
                            </span>

                            {item.label}
                          </span>

                          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 transition-colors group-hover:text-lime-300" />
                        </div>

                        <p className="mt-2 pl-[2.35rem] text-[13px] leading-relaxed tracking-[0.06em] text-zinc-600 transition-colors group-hover:text-zinc-400">
                          {item.description}
                        </p>
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>

            {/* System status */}
            <div className="relative border-t border-zinc-800 px-6 py-4">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_7px_rgba(163,230,53,0.7)]" />
                  Hálózat online
                </span>

                <span>Public access</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}