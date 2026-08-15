"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/useSessionGuard";

type OrderItem = {
  id: string;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type FulfillmentEvent = {
  id: string;
  created_at: string;
  event_type: string;
  actor_email: string | null;
  payload: unknown;
};

type OrderDetail = {
  id: string;
  created_at: string;
  status: string;
  product_id: string;
  amount: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  telegram_chat_id: string | null;
  delivery_note: string | null;
  dispatch_photo_url: string | null;
  dispatch_coordinates: Record<string, unknown> | null;
  dispatch_sent_at: string | null;
  fulfilled_at: string | null;
};

const STATUS_OPTIONS = ["pending", "paid", "ready_to_dispatch", "dispatched", "fulfilled", "cancelled"];

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;

  const { session, loading } = useSessionGuard();
  const token = (session as any)?.access_token as string | undefined;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<FulfillmentEvent[]>([]);
  const [status, setStatus] = useState("paid");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [dispatchCoordinatesText, setDispatchCoordinatesText] = useState("");
  const [dispatchDescription, setDispatchDescription] = useState("");
  const [dispatchPhotoUrl, setDispatchPhotoUrl] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const load = async () => {
    if (!orderId || !headers) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { headers });
      if (!response.ok) {
        throw new Error("Nem sikerült lekérni a rendelést.");
      }

      const payload = (await response.json()) as {
        order: OrderDetail;
        items: OrderItem[];
        events: FulfillmentEvent[];
      };

      setOrder(payload.order);
      setItems(payload.items ?? []);
      setEvents(payload.events ?? []);

      setStatus(payload.order.status);
      setDeliveryNote(payload.order.delivery_note ?? "");
      setDispatchPhotoUrl(payload.order.dispatch_photo_url ?? "");

      const maybeCoordText =
        payload.order.dispatch_coordinates && typeof payload.order.dispatch_coordinates === "object"
          ? String((payload.order.dispatch_coordinates as Record<string, unknown>).text ?? "")
          : "";
      setDispatchCoordinatesText(maybeCoordText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orderId, headers]);

  const saveStatus = async () => {
    if (!orderId || !headers) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status,
          deliveryNote,
          dispatchPhotoUrl: dispatchPhotoUrl || null,
          dispatchCoordinates: dispatchCoordinatesText ? { text: dispatchCoordinatesText } : null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Mentési hiba");
      }

      setNotice("Rendelés mentve.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setIsSaving(false);
    }
  };

  const sendDispatch = async () => {
    if (!orderId || !headers) return;
    setIsDispatching(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/dispatch`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          coordinatesText: dispatchCoordinatesText,
          description: dispatchDescription,
          photoUrl: dispatchPhotoUrl || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Dispatch küldési hiba");
      }

      setNotice("Telegram dispatch elküldve.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setIsDispatching(false);
    }
  };

  if (loading) return <div className="p-6 text-white">Betöltés...</div>;
  if (!session) return <div className="p-6 text-white">Jelentkezz be admin/editor jogosultsággal.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Detail</h1>
        <Link href="/admin/orders" className="text-sm text-lime-300 hover:underline">
          Vissza a listára
        </Link>
      </div>

      {error ? <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
      {notice ? <div className="rounded border border-lime-500/40 bg-lime-500/10 p-3 text-sm text-lime-300">{notice}</div> : null}

      {isLoading ? <div className="text-white/70">Rendelés betöltése...</div> : null}

      {order ? (
        <>
          <section className="rounded border border-white/15 bg-black/30 p-4">
            <div className="grid gap-2 text-sm text-white/80">
              <div>Order ID: {order.id}</div>
              <div>Létrehozva: {new Date(order.created_at).toLocaleString()}</div>
              <div>Termék: {order.product_id}</div>
              <div>
                Összeg: {order.amount} {(order.currency || "huf").toUpperCase()}
              </div>
              <div>Kapcsolat: {order.telegram_chat_id ? `tg:${order.telegram_chat_id}` : order.customer_email || "n/a"}</div>
            </div>
          </section>

          <section className="rounded border border-white/15 bg-black/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Státusz</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="border border-white/20 bg-black/40 px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                className="flex-1 border border-white/20 bg-black/40 px-3 py-2 text-sm"
                value={deliveryNote}
                onChange={(event) => setDeliveryNote(event.target.value)}
                placeholder="Delivery note"
              />

              <button
                type="button"
                onClick={saveStatus}
                disabled={isSaving}
                className="border border-lime-400/60 bg-lime-500/10 px-4 py-2 text-sm text-lime-300 disabled:opacity-50"
              >
                {isSaving ? "Mentés..." : "Mentés"}
              </button>
            </div>
          </section>

          <section className="rounded border border-white/15 bg-black/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Telegram Dispatch</h2>
            <div className="space-y-3">
              <input
                className="w-full border border-white/20 bg-black/40 px-3 py-2 text-sm"
                value={dispatchCoordinatesText}
                onChange={(event) => setDispatchCoordinatesText(event.target.value)}
                placeholder="Koordináták (pl. 47.4979, 19.0402)"
              />
              <textarea
                className="min-h-24 w-full border border-white/20 bg-black/40 px-3 py-2 text-sm"
                value={dispatchDescription}
                onChange={(event) => setDispatchDescription(event.target.value)}
                placeholder="Rövid leírás a helyről"
              />
              <input
                className="w-full border border-white/20 bg-black/40 px-3 py-2 text-sm"
                value={dispatchPhotoUrl}
                onChange={(event) => setDispatchPhotoUrl(event.target.value)}
                placeholder="Fotó URL (opcionális)"
              />
              <button
                type="button"
                onClick={sendDispatch}
                disabled={isDispatching}
                className="border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 disabled:opacity-50"
              >
                {isDispatching ? "Küldés..." : "Dispatch küldése Telegramon"}
              </button>
            </div>
          </section>

          <section className="rounded border border-white/15 bg-black/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Tételek</h2>
            <div className="space-y-2 text-sm text-white/80">
              {items.length === 0 ? <div>Nincs tétel.</div> : null}
              {items.map((item) => (
                <div key={item.id} className="border-b border-white/10 pb-2">
                  {item.product_name || item.product_id} x{item.quantity} = {item.line_total}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-white/15 bg-black/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Események</h2>
            <div className="space-y-2 text-sm text-white/80">
              {events.length === 0 ? <div>Nincs esemény.</div> : null}
              {events.map((event) => (
                <div key={event.id} className="border-b border-white/10 pb-2">
                  <div className="text-white/60">{new Date(event.created_at).toLocaleString()}</div>
                  <div>
                    {event.event_type} {event.actor_email ? `(${event.actor_email})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
