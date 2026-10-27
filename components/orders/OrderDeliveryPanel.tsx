"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, MapPin, PackageCheck, Truck } from "lucide-react";

type OrderSource = "orders" | "shop_orders";
type DeliveryMethod = "dead-drop" | "postaautomata" | "eu" | "personal" | "unknown";
type FulfillmentStatus =
  | "awaiting_contact"
  | "pickup_date_proposed"
  | "pickup_date_confirmed"
  | "preparing"
  | "location_released"
  | "shipped"
  | "received"
  | "cancelled";

type Fulfillment = {
  id: string | null;
  delivery_method: DeliveryMethod;
  fulfillment_status: FulfillmentStatus;
  proposed_pickup_at: string | null;
  confirmed_pickup_at: string | null;
  pickup_point: string | null;
  pickup_instructions: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  location_released_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

type Props = {
  orderId: string;
  source: OrderSource;
  token: string | null;
};

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  awaiting_contact: "Egyeztetésre vár",
  pickup_date_proposed: "Időpontjavaslat elküldve",
  pickup_date_confirmed: "Időpont elfogadva",
  preparing: "Összekészítés",
  location_released: "Átvételi hely megosztva",
  shipped: "Feladva / úton",
  received: "Átvéve",
  cancelled: "Kézbesítés törölve",
};

const METHOD_LABELS: Record<DeliveryMethod, string> = {
  "dead-drop": "Dead drop / egyeztetett átvétel",
  postaautomata: "Csomagautomata / csomagpont",
  eu: "EU-s szállítás",
  personal: "Személyes átvétel",
  unknown: "Nincs egyértelműen megadva",
};

function asLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function errorText(code: string) {
  const labels: Record<string, string> = {
    invalid_pickup_date: "Adj meg egy érvényes, jövőbeli időpontot.",
    pickup_date_not_proposed: "Nincs elfogadható időpontjavaslat.",
    pickup_date_must_be_confirmed: "A vásárlónak előbb el kell fogadnia az időpontot.",
    location_release_not_applicable: "Ehhez a kézbesítési módhoz nem tartozik megosztható átvételi helyszín.",
    valid_coordinates_and_instructions_required: "Érvényes szélesség, hosszúság és helyszínleírás szükséges.",
    tracking_number_required: "A feladáshoz add meg a nyomkövetési számot.",
    tracking_url_must_be_https: "A nyomkövetési linknek HTTPS címet kell használnia.",
    shipping_not_applicable: "Ez a kézbesítési mód nem csomagküldés.",
    order_not_ready_for_receipt: "A rendelés csak a helyszín megosztása vagy a csomag feladása után jelölhető átvettnek.",
    forbidden: "Ehhez a rendeléshez nincs hozzáférésed.",
  };
  return labels[code] ?? code.replaceAll("_", " ");
}

export default function OrderDeliveryPanel({ orderId, source, token }: Props) {
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [canConfirmPickup, setCanConfirmPickup] = useState(false);
  const [canMarkReceived, setCanMarkReceived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [proposedPickupLocal, setProposedPickupLocal] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);

  const load = useCallback(async () => {
    if (!headers) {
      setLoading(false);
      setError("A kézbesítési adatok megtekintéséhez jelentkezz be újra.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/order-threads/${encodeURIComponent(orderId)}/delivery?source=${source}`,
        { headers, cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "A kézbesítési adatok betöltése nem sikerült.");

      const row = payload.fulfillment as Fulfillment;
      setFulfillment(row);
      setIsStaff(Boolean(payload.isStaff));
      setCanConfirmPickup(Boolean(payload.canConfirmPickup));
      setCanMarkReceived(Boolean(payload.canMarkReceived));
      setProposedPickupLocal(asLocalInput(row?.proposed_pickup_at ?? null));
      setPickupLat(row?.pickup_lat == null ? "" : String(row.pickup_lat));
      setPickupLng(row?.pickup_lng == null ? "" : String(row.pickup_lng));
      setPickupInstructions(row?.pickup_instructions ?? "");
      setCarrier(row?.carrier ?? "");
      setTrackingNumber(row?.tracking_number ?? "");
      setTrackingUrl(row?.tracking_url ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "A kézbesítési adatok betöltése nem sikerült.");
    } finally {
      setLoading(false);
    }
  }, [headers, orderId, source]);

  useEffect(() => { void load(); }, [load]);

  async function updateFulfillment(action: string, extra: Record<string, unknown> = {}) {
    if (!headers || busyAction) return;
    setBusyAction(action);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/order-threads/${encodeURIComponent(orderId)}/delivery`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ source, action, ...extra }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorText(payload?.error || "update_failed"));
      setFulfillment(payload.fulfillment as Fulfillment);
      setNotice("A kézbesítési állapot frissült.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "A frissítés nem sikerült.");
    } finally {
      setBusyAction(null);
    }
  }

  const status = fulfillment?.fulfillment_status ?? "awaiting_contact";
  const method = fulfillment?.delivery_method ?? "unknown";
  const deadDropMethod = method === "dead-drop" || method === "personal";
  const parcelMethod = method === "postaautomata" || method === "eu";
  const closed = status === "received" || status === "cancelled";

  return (
    <section className="mt-5 rounded border border-zinc-800 bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-lime-200" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">Kézbesítési állapot</h3>
      </div>

      {loading ? <p className="text-xs text-zinc-600">Kézbesítési adatok betöltése…</p> : null}
      {error ? <div role="alert" className="mb-3 border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">{error}</div> : null}
      {notice ? <p role="status" className="mb-3 text-xs text-lime-200/80">{notice}</p> : null}

      {!loading && fulfillment ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-zinc-800 bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">Mód</p>
              <p className="mt-1 text-xs text-zinc-300">{METHOD_LABELS[method]}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">Állapot</p>
              <p className="mt-1 text-xs font-semibold text-lime-100">{STATUS_LABELS[status]}</p>
            </div>
          </div>

          {fulfillment.pickup_point ? (
            <p className="mt-3 text-xs text-zinc-400">Csomagpont: {fulfillment.pickup_point}</p>
          ) : null}

          {fulfillment.proposed_pickup_at ? (
            <div className="mt-3 flex items-start gap-2 rounded border border-amber-200/20 bg-amber-200/[0.035] p-3">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" aria-hidden="true" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-amber-100/70">
                  {status === "pickup_date_confirmed" || status === "location_released" ? "Egyeztetett időpont" : "Javasolt átvételi időpont"}
                </p>
                <p className="mt-1 text-sm text-zinc-100">{formatDateTime(fulfillment.confirmed_pickup_at ?? fulfillment.proposed_pickup_at)}</p>
              </div>
            </div>
          ) : null}

          {!isStaff && canConfirmPickup ? (
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void updateFulfillment("confirm_pickup_date")}
              className="mt-3 inline-flex min-h-10 items-center gap-2 border border-lime-200/40 bg-lime-100/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-100 hover:bg-lime-100/10 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {busyAction === "confirm_pickup_date" ? "MENTÉS…" : "ELFOGADOM AZ IDŐPONTOT"}
            </button>
          ) : null}

          {isStaff && deadDropMethod && ["awaiting_contact", "pickup_date_proposed", "pickup_date_confirmed"].includes(status) ? (
            <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">1. Átvételi időpont egyeztetése</p>
              <label className="block text-xs text-zinc-400">
                Időpont javaslata
                <input
                  type="datetime-local"
                  value={proposedPickupLocal}
                  onChange={(event) => setProposedPickupLocal(event.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <button
                type="button"
                disabled={!proposedPickupLocal || Boolean(busyAction)}
                onClick={() => {
                  const date = new Date(proposedPickupLocal);
                  void updateFulfillment("propose_pickup_date", {
                    proposedPickupAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
                  });
                }}
                className="border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-200 hover:bg-white/5 disabled:opacity-40"
              >
                {busyAction === "propose_pickup_date" ? "MENTÉS…" : "IDŐPONTJAVASLAT KÜLDÉSE"}
              </button>

              {status === "pickup_date_confirmed" ? (
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">2. Helyszín feloldása</p>
                  <p className="text-xs leading-relaxed text-zinc-500">A koordináták csak az időpont vásárlói elfogadása után válnak láthatóvá.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-zinc-400">Szélesség
                      <input inputMode="decimal" value={pickupLat} onChange={(event) => setPickupLat(event.target.value)} placeholder="47.4979" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
                    </label>
                    <label className="text-xs text-zinc-400">Hosszúság
                      <input inputMode="decimal" value={pickupLng} onChange={(event) => setPickupLng(event.target.value)} placeholder="19.0402" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
                    </label>
                  </div>
                  <label className="block text-xs text-zinc-400">Átvételi útmutató
                    <textarea value={pickupInstructions} onChange={(event) => setPickupInstructions(event.target.value.slice(0, 2000))} rows={3} maxLength={2000} placeholder="Helyszínleírás, támpontok, fotóhoz fűzött megjegyzés…" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
                  </label>
                  <button
                    type="button"
                    disabled={!pickupLat.trim() || !pickupLng.trim() || !pickupInstructions.trim() || Boolean(busyAction)}
                    onClick={() => void updateFulfillment("release_location", { pickupLat: Number(pickupLat), pickupLng: Number(pickupLng), pickupInstructions })}
                    className="inline-flex items-center gap-2 border border-lime-200/40 bg-lime-100/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-100 hover:bg-lime-100/10 disabled:opacity-40"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {busyAction === "release_location" ? "FELOLDÁS…" : "HELYSZÍN MEGOSZTÁSA A VÁSÁRLÓVAL"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {["location_released", "received"].includes(status) && fulfillment.pickup_lat != null && fulfillment.pickup_lng != null ? (
            <div className="mt-3 rounded border border-lime-200/20 bg-lime-200/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-lime-100/70">Átvételi hely</p>
              <p className="mt-1 font-mono text-sm text-zinc-100">{fulfillment.pickup_lat}, {fulfillment.pickup_lng}</p>
              <a
                href={`https://www.google.com/maps?q=${fulfillment.pickup_lat},${fulfillment.pickup_lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs text-lime-200 underline underline-offset-4"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Megnyitás térképen
              </a>
              {fulfillment.pickup_instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{fulfillment.pickup_instructions}</p> : null}
            </div>
          ) : null}

          {isStaff && parcelMethod && !closed ? (
            <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Csomagfeladás és nyomkövetés</p>
              <label className="block text-xs text-zinc-400">Futár / szolgáltató
                <input value={carrier} onChange={(event) => setCarrier(event.target.value)} maxLength={120} placeholder="GLS, Foxpost, Packeta…" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
              </label>
              <label className="block text-xs text-zinc-400">Nyomkövetési szám
                <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={160} placeholder="Küldeményazonosító" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
              </label>
              <label className="block text-xs text-zinc-400">Nyomkövetési link (opcionális)
                <input value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} maxLength={500} placeholder="https://…" className="mt-1 w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100" />
              </label>
              <button
                type="button"
                disabled={!trackingNumber.trim() || Boolean(busyAction)}
                onClick={() => void updateFulfillment("mark_shipped", { carrier, trackingNumber, trackingUrl })}
                className="inline-flex items-center gap-2 border border-lime-200/40 bg-lime-100/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-100 hover:bg-lime-100/10 disabled:opacity-40"
              >
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                {busyAction === "mark_shipped" ? "MENTÉS…" : "FELADVA / NYOMKÖVETÉS RÖGZÍTÉSE"}
              </button>
            </div>
          ) : null}

          {status === "shipped" ? (
            <div className="mt-3 rounded border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Küldemény</p>
              <p className="mt-1 text-sm text-zinc-200">{fulfillment.carrier || "Futárszolgálat"} · {fulfillment.tracking_number || "Nincs nyomkövetési szám"}</p>
              {fulfillment.tracking_url ? <a href={fulfillment.tracking_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-lime-200 underline underline-offset-4">Nyomkövetés megnyitása →</a> : null}
              {fulfillment.shipped_at ? <p className="mt-2 text-[10px] text-zinc-600">Feladva: {formatDateTime(fulfillment.shipped_at)}</p> : null}
            </div>
          ) : null}

          {!isStaff && canMarkReceived ? (
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void updateFulfillment("mark_received")}
              className="mt-3 inline-flex min-h-10 items-center gap-2 border border-lime-200/40 bg-lime-100/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-100 hover:bg-lime-100/10 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {busyAction === "mark_received" ? "MENTÉS…" : "ÁTVETTEM"}
            </button>
          ) : null}

          {status === "received" ? (
            <p className="mt-3 text-xs text-lime-200">A kézbesítés átvettként rögzítve.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
