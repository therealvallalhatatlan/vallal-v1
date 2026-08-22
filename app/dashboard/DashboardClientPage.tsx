"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/browser";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import PhantomPanel from "@/components/matrica/PhantomPanel";
import MerchChatSimulator from "./components/MerchChatSimulator";

const supabase = createClient();
const PHANTOM_PIN_VERIFIED_STORAGE_KEY = "phantom:pin-verified:v1";
const PHANTOM_SHADOW_SESSION_STORAGE_KEY = "phantom:shadow-session-id:v1";
const PHANTOM_PANEL_OPEN_STORAGE_KEY = "phantom:panel-open:v1";
const PHANTOM_SPONSOR_STORAGE_KEY = "phantom:sponsor-session-id:v1";

type ProfileRow = Record<string, any> | null;

type PhantomProfile = {
  session_id: string;
  sponsor_id: string | null;
  insider_enabled: boolean;
  drop_credits: number;
  banned_at: string | null;
  burn_reason?: string | null;
};

type PhantomDrop = {
  id: string;
  title?: string | null;
  description?: string | null;
  code_name: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  location_hint?: string | null;
  lat: number;
  lng: number;
  geofence_meters: number;
  is_claimed: boolean;
  claimed_at: string | null;
  claimed_by_session_id: string | null;
  burn_after: string | null;
  created_at: string;
  distance_meters?: number | null;
  can_claim?: boolean;
  is_mine?: boolean;
};

function createBrowserUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-${((8 + Math.floor(Math.random() * 4)).toString(16))}${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
}

function getOrCreateShadowSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(PHANTOM_SHADOW_SESSION_STORAGE_KEY);
  if (existing && existing.trim()) return existing.trim();

  const created = createBrowserUuid();
  window.localStorage.setItem(PHANTOM_SHADOW_SESSION_STORAGE_KEY, created);
  return created;
}

export default function DashboardClientPage({ serverEditor }: { serverEditor: boolean }) {
  const router = useRouter();
  const { session, loading } = useSessionGuard() as {
    session: { user?: { id?: string; email?: string }; access_token?: string } | null;
    loading: boolean;
  };
  const [profile, setProfile] = useState<ProfileRow>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [lastProfileRefreshAt, setLastProfileRefreshAt] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editorStatusLoading, setEditorStatusLoading] = useState(false);
  const [editorStatusError, setEditorStatusError] = useState<string | null>(null);
  const [isEditor, setIsEditor] = useState(serverEditor);
  const [pinInput, setPinInput] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [phantomPanelOpen, setPhantomPanelOpen] = useState(false);
  const [phantomSessionId, setPhantomSessionId] = useState<string | null>(null);
  const [phantomProfile, setPhantomProfile] = useState<PhantomProfile | null>(null);
  const [phantomDrops, setPhantomDrops] = useState<PhantomDrop[]>([]);
  const [phantomLoading, setPhantomLoading] = useState(false);
  const [phantomNotice, setPhantomNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoRetry, setGeoRetry] = useState(0);
  const userId = session?.user?.id;
  const accessToken = session?.access_token;

  const loadProfileOverview = useCallback(async () => {
    if (!accessToken) return;

    setProfileLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/overview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json?.overview) {
        setError("Nem sikerult betolteni az osszesitett profil adatokat.");
        setProfile(null);
        return;
      }

      const overview = json.overview as Record<string, any>;
      setProfile(overview);
      setDisplayName((overview?.database?.user?.nickname as string | undefined) ?? "");
      setLastProfileRefreshAt(new Date().toISOString());
    } catch {
      setError("Nem sikerult betolteni az osszesitett profil adatokat.");
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!userId || !accessToken) return;
    void loadProfileOverview();
  }, [accessToken, loadProfileOverview, userId]);

  useEffect(() => {
    if (!accessToken) return;

    const intervalId = window.setInterval(() => {
      void loadProfileOverview();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [accessToken, loadProfileOverview]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restored = window.localStorage.getItem(PHANTOM_PIN_VERIFIED_STORAGE_KEY) === "1";
    setPinVerified(restored);

    const restoredPanelOpen = window.localStorage.getItem(PHANTOM_PANEL_OPEN_STORAGE_KEY) === "1";
    if (restored && restoredPanelOpen) {
      setPhantomPanelOpen(true);
    }

    const restoredSessionId = getOrCreateShadowSessionId();
    if (restoredSessionId) {
      setPhantomSessionId(restoredSessionId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PHANTOM_PANEL_OPEN_STORAGE_KEY, phantomPanelOpen ? "1" : "0");
  }, [phantomPanelOpen]);

  useEffect(() => {
    if (!isEditor) {
      setPhantomPanelOpen(false);
      return;
    }
    if (!pinVerified) {
      setPhantomPanelOpen(false);
    }
  }, [isEditor, pinVerified]);

  useEffect(() => {
    if (!accessToken) {
      setIsEditor(false);
      return;
    }

    const loadEditorStatus = async () => {
      setEditorStatusLoading(true);
      setEditorStatusError(null);

      try {
        const res = await fetch("/api/user/editor-status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          setIsEditor(false);
          setEditorStatusError("Nem sikerult lekerdezni az editor jogosultsagot.");
          return;
        }

        setIsEditor(Boolean(json.isEditor) && serverEditor);
      } catch {
        setIsEditor(false);
        setEditorStatusError("Nem sikerult lekerdezni az editor jogosultsagot.");
      } finally {
        setEditorStatusLoading(false);
      }
    };

    void loadEditorStatus();
  }, [accessToken, serverEditor]);

  useEffect(() => {
    if (!isEditor || !pinVerified) return;
    setGeoLoading(true);
    setGeoError(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("A bongeszo nem tamogatja a helymeghatarozast.");
      setGeoLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoError(null);
        setGeoLoading(false);
      },
      () => {
        setGeoError("Helymeghatarozas engedelye szukseges a Phantom claim/publish funkciokhoz.");
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isEditor, pinVerified, geoRetry]);

  const refreshPhantom = useCallback(async (sessionIdOverride?: string) => {
    const effectiveSessionId = sessionIdOverride ?? phantomSessionId;
    if (!accessToken || !effectiveSessionId) return;

    setPhantomLoading(true);
    setPhantomNotice(null);

    try {
      const sponsorSessionId = typeof window !== "undefined"
        ? window.localStorage.getItem(PHANTOM_SPONSOR_STORAGE_KEY)
        : null;

      const sessionRes = await fetch("/api/phantom/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          shadow_session_id: effectiveSessionId,
          sponsor_session_id: sponsorSessionId,
        }),
      });

      const sessionJson = await sessionRes.json().catch(() => ({} as Record<string, unknown>));
      if (!sessionRes.ok || !sessionJson?.profile) {
        throw new Error(typeof sessionJson?.error === "string" ? sessionJson.error : `HTTP ${sessionRes.status}`);
      }

      setPhantomProfile(sessionJson.profile as PhantomProfile);

      const dropsUrl = new URL("/api/phantom/drops", window.location.origin);
      dropsUrl.searchParams.set("shadow_session_id", effectiveSessionId);
      if (userLocation) {
        dropsUrl.searchParams.set("lat", String(userLocation.lat));
        dropsUrl.searchParams.set("lng", String(userLocation.lng));
      }

      const dropsRes = await fetch(dropsUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const dropsJson = await dropsRes.json().catch(() => ({} as Record<string, unknown>));
      if (!dropsRes.ok) {
        throw new Error(typeof dropsJson?.error === "string" ? dropsJson.error : `HTTP ${dropsRes.status}`);
      }

      setPhantomDrops(Array.isArray(dropsJson?.drops) ? (dropsJson.drops as PhantomDrop[]) : []);
    } catch {
      setPhantomNotice({ type: "error", message: "Phantom sync hiba." });
    } finally {
      setPhantomLoading(false);
      void loadProfileOverview();
    }
  }, [accessToken, loadProfileOverview, phantomSessionId, userLocation]);

  useEffect(() => {
    if (!phantomPanelOpen) return;
    void refreshPhantom();
  }, [phantomPanelOpen, refreshPhantom]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; status?: string } | null;
      if (!data || data.type !== "phantom-credit-checkout-status") return;

      if (data.status === "success") {
        setPhantomNotice({ type: "success", message: "Sikeres fizetes. A Titkos Jelszot emailben kuldtuk." });
      } else if (data.status === "cancelled") {
        setPhantomNotice({ type: "info", message: "Fizetes megszakitva." });
      }

      void refreshPhantom();
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [refreshPhantom]);

  const handleClaimPhantomDrop = useCallback(async (dropId: string) => {
    if (!accessToken || !phantomSessionId) {
      setPhantomNotice({ type: "error", message: "Bejelentkezes szukseges." });
      return;
    }

    if (!userLocation) {
      setPhantomNotice({ type: "error", message: "Helymeghatarozas szukseges a claimhez." });
      return;
    }

    const res = await fetch("/api/phantom/drops/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        shadow_session_id: phantomSessionId,
        drop_id: dropId,
        lat: userLocation.lat,
        lng: userLocation.lng,
      }),
    });

    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      const code = typeof json?.error === "string" ? json.error : "claim_failed";
      if (code === "too_far") {
        setPhantomNotice({ type: "error", message: "Tul messze vagy a drop claimhez." });
      } else if (code === "drop_already_claimed") {
        setPhantomNotice({ type: "info", message: "Ezt a dropot mar valaki claimelte." });
      } else {
        setPhantomNotice({ type: "error", message: "Drop claim sikertelen." });
      }
      await refreshPhantom();
      return;
    }

    setPhantomNotice({ type: "success", message: "Drop claimelve. Burn timer indult." });
    await refreshPhantom();
  }, [accessToken, phantomSessionId, refreshPhantom, userLocation]);

  const handlePublishPhantomDrop = useCallback(async (payload: {
    title: string;
    description: string;
    code_name: string;
    image_url: string | null;
    image_urls: string[];
    location_hint: string;
    lat: number;
    lng: number;
    geofence_meters: number;
  }) => {
    if (!accessToken || !phantomSessionId) {
      setPhantomNotice({ type: "error", message: "Bejelentkezes szukseges." });
      return;
    }

    if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
      setPhantomNotice({ type: "error", message: "Ervenyes koordinata szukseges a publikaloz." });
      return;
    }

    const res = await fetch("/api/phantom/drops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        shadow_session_id: phantomSessionId,
        title: payload.title,
        description: payload.description,
        code_name: payload.code_name,
        image_url: payload.image_url,
        image_urls: payload.image_urls,
        location_hint: payload.location_hint,
        lat: payload.lat,
        lng: payload.lng,
        geofence_meters: payload.geofence_meters,
      }),
    });

    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      const code = typeof json?.error === "string" ? json.error : "publish_failed";
      if (code === "missing_title") {
        setPhantomNotice({ type: "error", message: "A cim kotelezo." });
      } else if (code === "invalid_coordinates") {
        setPhantomNotice({ type: "error", message: "Ervenyes helypontot valassz." });
      } else if (code === "phantom_schema_not_migrated") {
        setPhantomNotice({ type: "error", message: "A Phantom rich schema migracioja meg nincs fent az adatbazisban." });
      } else if (code === "insider_required") {
        setPhantomNotice({ type: "error", message: "Insider jog kell a drop publishhez." });
      } else if (code === "insufficient_drop_credits") {
        setPhantomNotice({ type: "info", message: "Nincs eleg drop credited." });
      } else {
        setPhantomNotice({ type: "error", message: "Drop publish sikertelen." });
      }
      await refreshPhantom();
      return;
    }

    setPhantomNotice({ type: "success", message: "Drop publikaltad." });
    await refreshPhantom();
  }, [accessToken, phantomSessionId, refreshPhantom]);

  const handleAuthenticatePhantom = useCallback(async (payload: { sessionId: string; voucherCode: string }) => {
    const sessionId = payload.sessionId.trim();
    if (!accessToken || !sessionId) {
      setPhantomNotice({ type: "error", message: "Bejelentkezes szukseges." });
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PHANTOM_SHADOW_SESSION_STORAGE_KEY, sessionId);
    }
    setPhantomSessionId(sessionId);

    const res = await fetch("/api/phantom/vouchers/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        shadow_session_id: sessionId,
        voucher_code: payload.voucherCode,
      }),
    });

    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok || !json?.ok) {
      const code = typeof json?.error === "string" ? json.error : "voucher_failed";
      if (code === "invalid_shadow_session_id") {
        setPhantomNotice({ type: "error", message: "Ervenytelen Session ID formatum." });
      } else if (code === "voucher_already_redeemed") {
        setPhantomNotice({ type: "info", message: "Voucher mar bevaltva." });
      } else if (code === "invalid_voucher_code") {
        setPhantomNotice({ type: "error", message: "Ervenytelen voucher kod." });
      } else {
        setPhantomNotice({ type: "error", message: "Voucher redeem sikertelen." });
      }
      await refreshPhantom(sessionId);
      return;
    }

    const creditsAdded = Number(json.credits_added || 0);
    setPhantomNotice({ type: "success", message: `Voucher bevaltva (+${creditsAdded} credit).` });
    await refreshPhantom(sessionId);
  }, [accessToken, refreshPhantom]);

  const handleStartPhantomCreditPurchase = useCallback(async (credits: number) => {
    if (!accessToken || !phantomSessionId) {
      setPhantomNotice({ type: "error", message: "Session ID es bejelentkezes szukseges." });
      throw new Error("missing_session_or_auth");
    }

    const normalizedCredits = Math.max(1, Math.floor(credits));
    const res = await fetch("/api/phantom/credits/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        shadow_session_id: phantomSessionId,
        credits: normalizedCredits,
      }),
    });

    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    const checkoutUrl = typeof json?.url === "string" ? json.url : null;
    if (!res.ok || !checkoutUrl) {
      const code = typeof json?.error === "string" ? json.error : "checkout_failed";
      if (code === "invalid_shadow_session_id") {
        setPhantomNotice({ type: "error", message: "Ervenytelen Session ID formatum." });
      } else {
        setPhantomNotice({ type: "error", message: "Nem sikerult elinditani a fizetest." });
      }
      throw new Error(code);
    }

    setPhantomNotice({ type: "info", message: "Fizetesi ablak megnyitva. A kodot emailben kuldjuk." });
    return checkoutUrl;
  }, [accessToken, phantomSessionId]);

  if (loading || (!session && !loading)) {
    return (
      <main className="min-h-screen bg-black text-neutral-100">
        <div className="flex items-center justify-center px-6 py-10">
          <p className="text-sm text-neutral-300">Betöltés...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">dashboard</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-lime-400">Üdv, {displayName || session?.user?.email}</h1>
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await supabase.auth.signOut();
                router.replace("/auth");
                setLoggingOut(false);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-60"
            >
              {loggingOut ? "Kilépés..." : "Kijelentkezés"}
            </button>
          </div>
          <p className="mt-2 text-sm text-neutral-300">
            Itt látod a felhasználói rekordod a Supabase adatbázisban.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span>Megjelenített név</span>
              {saving && <span className="text-xs text-neutral-500">Mentés...</span>}
            </div>

            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Add meg a megjelenített nevet"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-lime-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={saving || !userId}
                onClick={async () => {
                  if (!userId) return;
                  setSaving(true);
                  setError(null);
                  const { data, error } = await supabase
                    .from("users")
                    .update({ nickname: displayName })
                    .eq("id", userId)
                    .select("*")
                    .single();

                  if (error) {
                    setError(error.message);
                  } else {
                    setProfile((prev) => ({
                      ...(prev || {}),
                      database: {
                        ...((prev as any)?.database || {}),
                        user: data,
                      },
                    }));
                    void loadProfileOverview();
                  }

                  setSaving(false);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
              >
                Mentés
              </button>
            </div>
          </div>

          {editorStatusLoading && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <p className="text-sm text-neutral-400">Editor jogosultsag ellenorzese...</p>
            </div>
          )}

          {editorStatusError && (
            <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/40 p-4">
              <p className="text-sm text-amber-300">{editorStatusError}</p>
            </div>
          )}

          {isEditor && (
            <div className="mt-6 rounded-2xl border border-lime-800 bg-lime-950/20 p-4">
              <div className="flex items-center justify-between text-sm text-lime-200">
                <span>Phantom hozzaferes PIN</span>
                {pinVerified && <span className="text-xs text-lime-300">Ellenorizve</span>}
              </div>
              <p className="mt-2 text-xs text-neutral-300">
                Itt tudod ellenorizni a Phantom PIN-kodot. Sikeres ellenorzes utan a rendszer elmenti a jovahagyott allapotot.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPinInput(digitsOnly);
                    setPinMessage(null);
                  }}
                  placeholder="4 jegyu PIN"
                  className="w-full max-w-[220px] rounded-lg border border-lime-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-lime-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={pinSubmitting || pinInput.length !== 4}
                  onClick={async () => {
                    setPinSubmitting(true);
                    setPinMessage(null);

                    try {
                      const res = await fetch("/api/phantom/pin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pin: pinInput }),
                      });

                      const json = await res.json().catch(() => ({}));
                      if (!res.ok || !json?.ok) {
                        setPinVerified(false);
                        setPinMessage("Hibas PIN-kod.");
                        return;
                      }

                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(PHANTOM_PIN_VERIFIED_STORAGE_KEY, "1");
                        window.localStorage.setItem(PHANTOM_PANEL_OPEN_STORAGE_KEY, "1");
                      }

                      setPinVerified(true);
                      setPhantomPanelOpen(true);
                      setPinInput("");
                      setPinMessage("PIN ellenorizve. Phantom hozzaferes engedelyezve.");
                    } catch {
                      setPinVerified(false);
                      setPinMessage("PIN ellenorzes sikertelen. Probald ujra.");
                    } finally {
                      setPinSubmitting(false);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
                >
                  {pinSubmitting ? "Ellenorzes..." : "PIN ellenorzes"}
                </button>
              </div>

              {pinMessage && (
                <p className={`mt-3 text-sm ${pinVerified ? "text-lime-300" : "text-red-400"}`}>
                  {pinMessage}
                </p>
              )}

              {pinVerified && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPhantomPanelOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
                  >
                    Phantom panel megnyitasa
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoRetry((value) => value + 1)}
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
                  >
                    GPS ujraproba
                  </button>
                </div>
              )}
            </div>
          )}

          {isEditor && pinVerified && (
            <div className="mt-6 rounded-2xl border border-lime-800 bg-lime-950/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-lime-200">
                <span>Phantom dashboard allapot</span>
                <span className="text-xs text-neutral-300">Session: {phantomSessionId || "n/a"}</span>
              </div>

              <div className="mt-2 grid gap-2 text-xs text-neutral-300">
                <p>Panel: {phantomPanelOpen ? "nyitva" : "zarva"}</p>
                <p>GPS: {geoLoading ? "keresese folyamatban" : userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "nincs adat"}</p>
                {geoError ? <p className="text-amber-300">{geoError}</p> : null}
                {phantomNotice ? (
                  <p className={phantomNotice.type === "error" ? "text-red-400" : phantomNotice.type === "success" ? "text-lime-300" : "text-sky-300"}>
                    {phantomNotice.message}
                  </p>
                ) : null}
              </div>

              <PhantomPanel
                isOpen={phantomPanelOpen}
                variant="offcanvas"
                showCloseButton
                canPublishDrops={isEditor}
                authToken={accessToken ?? null}
                shadowSessionId={phantomSessionId}
                profile={phantomProfile}
                drops={phantomDrops}
                userLocation={userLocation}
                loading={phantomLoading}
                onClose={() => setPhantomPanelOpen(false)}
                onAuthenticate={handleAuthenticatePhantom}
                onStartCreditPurchase={handleStartPhantomCreditPurchase}
                onClaimDrop={handleClaimPhantomDrop}
                onPublishDrop={handlePublishPhantomDrop}
              />
            </div>
          )}

          {isEditor && (
            <div className="mt-6 rounded-2xl border border-lime-800 bg-lime-950/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-lime-200">
                <span>Merch admin chat workspace</span>
                <span className="text-xs text-lime-300">Editor only</span>
              </div>
              <p className="mt-2 text-xs text-neutral-300">
                Telegram/Discord stílusú műveleti felület Stripe link generáláshoz és fizetett rendelések áttekintéséhez.
              </p>
              <MerchChatSimulator />
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span>Profil adatok</span>
              <div className="flex items-center gap-3">
                {lastProfileRefreshAt ? (
                  <span className="text-xs text-neutral-500">
                    Frissitve: {new Date(lastProfileRefreshAt).toLocaleTimeString("hu-HU")}
                  </span>
                ) : null}
                {profileLoading && <span className="text-xs text-neutral-500">Frissítés...</span>}
                <button
                  type="button"
                  onClick={() => {
                    void loadProfileOverview();
                  }}
                  className="inline-flex items-center justify-center rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800"
                >
                  Frissites
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              Ebben a JSON-ban a userhez kapcsolodo osszesitett adatok latszanak: auth metadata, users rekord, claim-ek, valamint Phantom profilok es credit osszegzes. Automatikus frissites 20 masodpercenkent.
            </p>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {profile && !error && (
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-neutral-200">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}

            {!profile && !profileLoading && !error && (
              <p className="mt-3 text-sm text-neutral-400">
                Nem találtunk rekordot a felhasználóhoz.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
