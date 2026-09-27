import Link from "next/link";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NotificationComposer from "./NotificationComposer";

function expectedPinHash(): string | null {
  const pin = process.env.ADMIN_DASHBOARD_PIN;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback";
  if (!pin) return null;
  return createHash("sha256").update(pin + secret).digest("hex");
}

export const dynamic = "force-dynamic";

export default async function NotificationsAdminPage() {
  const cookieStore = await cookies();
  const pinCookie = cookieStore.get("x-admin-pin")?.value ?? "";
  const expected = expectedPinHash();

  if (!expected || pinCookie !== expected) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.025] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/60">
            Admin · V3
          </p>
          <h1 className="mt-2 text-xl">Nincs hozzáférés.</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Nyisd meg előbb az admin dashboardot, és hitelesítsd magad a PIN-kóddal.
          </p>
          <Link
            href="/v3/dashboard"
            className="mt-6 inline-flex rounded-lg border border-white/10 px-4 py-2 text-xs text-neutral-300 transition hover:border-lime-400/30 hover:text-lime-200"
          >
            ← Admin dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: broadcasts, error } = await supabaseAdmin()
    .from("notification_broadcasts")
    .select("id, title, body, recipient_count, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
        <header className="border-b border-white/8 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/60">
                Admin · V3
              </p>
              <h1 className="mt-1 text-2xl font-light tracking-[0.04em]">
                Rendszerüzenetek
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Egy üzenet, minden user. A küldés pillanatában létező összes
                felhasználó külön notification rekordot kap, olvasatlanul.
              </p>
            </div>

            <Link
              href="/v3/dashboard"
              className="inline-flex shrink-0 rounded-lg border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-200"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        <section className="py-8">
          <NotificationComposer />
        </section>

        <section className="border-t border-white/8 pt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                Előző küldések
              </p>
              <h2 className="mt-1 text-lg font-light text-neutral-200">
                Broadcast history
              </h2>
            </div>
            {error && (
              <span className="text-xs text-red-400">
                Nem sikerült betölteni az előzményeket.
              </span>
            )}
          </div>

          <div className="mt-5 space-y-2">
            {(broadcasts ?? []).map((broadcast) => (
              <article
                key={broadcast.id}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-100">
                      {broadcast.title}
                    </p>
                    {broadcast.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-500">
                        {broadcast.body}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-neutral-700 sm:text-right">
                    <div>
                      {new Date(broadcast.created_at).toLocaleString("hu-HU")}
                    </div>
                    <div className="mt-1">
                      {broadcast.recipient_count} címzett
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {(broadcasts ?? []).length === 0 && !error && (
              <p className="py-8 text-center text-sm text-neutral-700">
                Még nincs elküldött rendszerüzenet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
