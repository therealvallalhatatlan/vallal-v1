"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Facebook, KeyRound, LogOut, Mail, Menu, MessageCircle, Rss, UserRound, X } from "lucide-react";

import { useSessionGuard } from "@/hooks/useSessionGuard";
import { createClient } from "@/lib/browser";

const NAV_LINKS = [
  { label: "Shop", href: "/shop", accent: true },
  { label: "Reader", href: "/reader", protected: true },
  { label: "Hálózat", href: "/halozat", protected: true },
  { label: "Támogatás", href: "/tamogatas" },
];

const SOCIAL_LINKS = [
  { label: "Email", href: "mailto:therealvallalhatatlan@gmail.com", icon: Mail },
  { label: "Facebook", href: "https://www.facebook.com/vallalhatatlan2000", icon: Facebook },
  { label: "Reddit", href: "https://reddit.com/r/vallalhatatlan", icon: MessageCircle },
  { label: "Substack", href: "https://vallalhatatlan.substack.com/", icon: Rss },
];

type SessionUser = {
  id?: string;
  email?: string | null;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
};

function Avatar({ avatarUrl, label }: { avatarUrl?: string | null; label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  if (!avatarUrl) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white/80">
        {initial}
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={label}
      className="h-10 w-10 rounded-full border border-white/15 object-cover"
      referrerPolicy="no-referrer"
    />
  );
}

export default function Navigation() {
  const { session, error } = useSessionGuard();
  const [isClient, setIsClient] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const user = (session as { user?: SessionUser } | null)?.user;
  const userEmail = user?.email ?? null;
  const userId = user?.id ?? null;
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const profileLabel = user?.user_metadata?.full_name || userEmail || "Profil";

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  if (error) {
    console.error("[Navigation] Auth error:", error);
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.replace("/auth");
    setIsLoggingOut(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  if (!isClient) {
    return (
      <div className="relative">
        <nav className="border-b border-white/10 px-4 py-4 font-mono md:px-8">
          <div className="flex items-center justify-between gap-4">
            <a href="/" className="ml-0 md:ml-[124px]">
              <img src="/img/logo.png" alt="Vállalhatatlan" className="h-10 w-auto" />
            </a>
            <span className="h-10 w-10 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="relative">
      <nav className="border-b border-white/10 bg-black/70 px-4 py-4 font-mono text-gray-200 backdrop-blur md:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity md:ml-[124px]">
            <img src="/img/logo.png" alt="Vállalhatatlan" className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            {userEmail ? <Avatar avatarUrl={avatarUrl} label={profileLabel} /> : null}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Navigáció megnyitása"
              aria-expanded={isMenuOpen}
              className="inline-flex h-12 w-12 items-center justify-center border border-white/15 bg-white/5 text-white transition-colors hover:border-lime-400 hover:text-lime-300"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black/65 transition-opacity duration-300 ${
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col border-l border-white/10 bg-[#050505]/95 text-white shadow-[-24px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-lime-300/80">Navigáció</p>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Navigáció bezárása"
            className="inline-flex h-11 w-11 items-center justify-center border border-white/15 bg-white/5 text-white transition-colors hover:border-lime-400 hover:text-lime-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-10 overflow-y-auto px-5 py-6 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:px-8 md:py-8">
          <section>
            <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-white/40">Ugrópontok</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.protected && !userEmail ? `/auth?from=${encodeURIComponent(link.href)}` : link.href}
                  onClick={closeMenu}
                  className={`group border px-4 py-4 transition-colors ${
                    link.accent
                      ? "border-lime-500/40 bg-lime-500/10 text-lime-300 hover:border-lime-400 hover:bg-lime-500/15"
                      : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-base font-semibold tracking-[0.08em]">{link.label}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.24em] text-white/40 group-hover:text-white/55">
                    Megnyitás
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-white/40">Profil</p>

              {userEmail ? (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar avatarUrl={avatarUrl} label={profileLabel} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{profileLabel}</p>
                      <p className="truncate text-xs text-white/50">{userEmail}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <Link
                      href={userId ? `/user/${userId}` : "/dashboard"}
                      onClick={closeMenu}
                      className="inline-flex items-center justify-between border border-white/10 px-4 py-3 text-sm text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        Profil megnyitása
                      </span>
                      <span className="text-white/35">/</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="inline-flex items-center justify-between border border-red-400/20 px-4 py-3 text-sm text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        {isLoggingOut ? "Kilépés..." : "Kijelentkezés"}
                      </span>
                      <span className="text-red-200/40">/</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid gap-3">
                  <Link
                    href="/auth?from=/reader"
                    onClick={closeMenu}
                    className="inline-flex items-center justify-between border border-lime-500/40 bg-lime-500/10 px-4 py-3 text-sm font-semibold text-lime-300 transition-colors hover:border-lime-400 hover:bg-lime-500/15"
                  >
                    <span className="inline-flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Klubtagoknak
                    </span>
                    <span className="text-lime-300/45">/</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-white/40">Kapcsolat</p>
              <div className="grid gap-3">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith("mailto") ? undefined : "_blank"}
                    rel={link.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                    className="inline-flex items-center gap-3 border border-white/10 px-4 py-3 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-lime-300"
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
