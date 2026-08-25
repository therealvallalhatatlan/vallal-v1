'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardContent from "@/components/dashboard/UserDashboard";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { buildAuthHref } from "@/lib/authRedirect";
import type { DashboardApiResponse } from "@/types/dashboard";

type FetchState = "idle" | "loading" | "success" | "error";

type SessionGuardResult = {
  session: { access_token?: string } | null;
  loading: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSessionGuard() as SessionGuardResult;
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const token = useMemo(() => session?.access_token ?? null, [session]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace(buildAuthHref("/dashboard"));
      return;
    }

    if (!token) {
      setMessage("Érvénytelen hitelesítés.");
      setFetchState("error");
      return;
    }

    const controller = new AbortController();

    setFetchState("loading");
    setMessage(null);

    fetch(`/api/user/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText || `HTTP ${response.status}`);
        }
        return response.json() as Promise<DashboardApiResponse>;
      })
      .then((payload) => {
        setData(payload);
        setFetchState("success");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("/dashboard fetch error", error);
        setMessage("Nem sikerült betölteni az adatokat. Próbáld újra később.");
        setFetchState("error");
      });

    return () => controller.abort();
  }, [session, loading, router, token]);

  if (loading || fetchState === "loading" || fetchState === "idle") {
    return (
      <div className="min-h-screen bg-black px-6 py-20 text-center text-zinc-200">
        <p className="text-base uppercase tracking-[0.35em] text-zinc-500">dashboard betöltése</p>
        <p className="mt-3 text-sm text-zinc-400">Kérlek várj, amint a rendszer hitelesít.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black px-6 py-20 text-center text-zinc-200">
        <p className="text-base uppercase tracking-[0.35em] text-zinc-500">átirányítás</p>
        <p className="mt-3 text-sm text-zinc-400">Hitelesítés nélkül nem férhetsz hozzá a Hálózathoz.</p>
      </div>
    );
  }

  if (fetchState === "error" || !data) {
    return (
      <div className="min-h-screen bg-black px-6 py-20 text-center text-zinc-200">
        <p className="text-sm uppercase tracking-[0.4em] text-zinc-500">Hiba</p>
        <p className="mt-3 text-xl leading-tight text-zinc-100">{message ?? "Nem sikerült betölteni a dashboardot."}</p>
      </div>
    );
  }

  return <DashboardContent data={data} token={token} />;
}
