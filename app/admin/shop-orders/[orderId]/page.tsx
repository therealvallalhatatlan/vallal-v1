"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import OrderMessagesPanel from "@/components/orders/OrderMessagesPanel";
import OrderDeliveryPanel from "@/components/orders/OrderDeliveryPanel";

type ShopOrderItem = {
  id: string;
  product_id: string;
  product_type: string;
  product_name: string;
  variant_id: string | null;
  quantity: number;
  unit_amount: number;
};
type ShopOrder = {
  id: string;
  order_type: string;
  status: string;
  currency: string;
  subtotal_amount: number;
  total_amount: number;
  customer_email: string | null;
  user_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  paid_at: string | null;
  user_received_at: string | null;
};

function formatAmount(minorAmount: number, currency: string) {
  const code = (currency || "huf").toUpperCase();
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: code,
    maximumFractionDigits: code === "HUF" ? 0 : 2,
  }).format(minorAmount / 100);
}

const DELIVERY_LABELS: Record<string, string> = {
  "dead-drop": "Dead drop / egyeztetett átvétel",
  postaautomata: "Csomagautomata / csomagpont",
  eu: "EU-n belüli szállítás",
};

export default function AdminShopOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const { session, loading } = useSessionGuard();
  const token = (session as any)?.access_token as string | undefined;
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [items, setItems] = useState<ShopOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!headers || !orderId) return;
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/shop-orders/${encodeURIComponent(orderId)}`, { headers, cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "A rendelés betöltése nem sikerült.");
        if (!active) return;
        setOrder(payload.order);
        setItems(Array.isArray(payload.items) ? payload.items : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Ismeretlen hiba");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [headers, orderId]);

  if (loading) return <div className="p-6 text-white">Betöltés...</div>;
  if (!session) return <div className="p-6 text-white">Jelentkezz be admin/editor jogosultsággal.</div>;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6 text-white">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime-200/60">WEBÁRUHÁZ / RENDELÉS</p>
          <h1 className="mt-2 text-2xl font-bold">Rendelés részletei</h1>
        </div>
        <Link href="/admin/shop-orders" className="text-sm text-lime-200 hover:underline">← Vissza a webshopos rendelésekhez</Link>
      </header>

      {error ? <div role="alert" className="border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</div> : null}
      {isLoading ? <p className="text-sm text-white/50">Rendelés betöltése…</p> : null}

      {order ? (
        <>
          <section className="rounded border border-white/15 bg-black/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Rendelésazonosító</p><p className="mt-1 break-all font-mono text-sm">{order.id}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Állapot</p><p className="mt-1 text-sm">{order.status}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Létrehozva</p><p className="mt-1 text-sm">{new Date(order.created_at).toLocaleString("hu-HU")}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Vásárló</p><p className="mt-1 break-all text-sm">{order.customer_email || "Nincs email rögzítve"}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Kézbesítés</p><p className="mt-1 text-sm">{DELIVERY_LABELS[String(order.metadata?.deliveryMethod ?? "")] ?? String(order.metadata?.deliveryMethod ?? "Nincs megadva")}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Csomagpont / automata</p><p className="mt-1 text-sm">{typeof order.metadata?.pickupPoint === "string" ? order.metadata.pickupPoint : "—"}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Fizetve</p><p className="mt-1 text-sm">{order.paid_at ? new Date(order.paid_at).toLocaleString("hu-HU") : "Nincs fizetési dátum"}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Végösszeg</p><p className="mt-1 text-lg font-semibold text-lime-100">{formatAmount(order.total_amount, order.currency)}</p></div>
              {order.user_received_at ? <div><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Átvette</p><p className="mt-1 text-sm text-lime-200">{new Date(order.user_received_at).toLocaleString("hu-HU")}</p></div> : null}
            </div>
          </section>

          <section className="rounded border border-white/15 bg-black/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Tételek</h2>
            <div className="space-y-2 text-sm text-white/80">
              {items.length === 0 ? <p className="text-white/50">Ehhez a rendeléshez nincs tétel rögzítve.</p> : null}
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-2">
                  <span>{item.product_name || item.product_id}{item.variant_id ? ` · ${item.variant_id}` : ""} × {item.quantity}</span>
                  <span>{formatAmount(Number(item.unit_amount) * Number(item.quantity), order.currency)}</span>
                </div>
              ))}
            </div>
          </section>

          <OrderDeliveryPanel orderId={order.id} source="shop_orders" token={token ?? null} />
          <OrderMessagesPanel orderId={order.id} source="shop_orders" token={token ?? null} />
        </>
      ) : null}
    </main>
  );
}
