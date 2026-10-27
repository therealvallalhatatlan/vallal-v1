"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/useSessionGuard";

type ShopOrder = {
  id: string;
  order_type: string;
  status: string;
  currency: string;
  subtotal_amount: number;
  total_amount: number;
  customer_email: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  paid_at: string | null;
  user_received_at: string | null;
};

type AccessState = "checking" | "allowed" | "denied" | "error";

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
  eu: "EU-s szállítás",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Fizetésre vár",
  paid: "Fizetve",
  canceled: "Törölve",
  payment_failed: "Sikertelen fizetés",
};

export default function AdminShopOrdersPage() {
  const { session, loading } = useSessionGuard();
  const token = (session as any)?.access_token as string | undefined;
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [status, setStatus] = useState("all");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : undefined, [token]);

  useEffect(() => {
    if (!headers) return;
    let active = true;

    const load = async () => {
      setLoadingOrders(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/shop-orders?status=${encodeURIComponent(status)}&limit=200`, {
          headers,
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          if (active) {
            setOrders([]);
            setAccessState("denied");
          }
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Nem sikerült ellenőrizni a jogosultságot vagy betölteni a webshopos rendeléseket.");
        }

        if (active) {
          setOrders(Array.isArray(payload.orders) ? payload.orders : []);
          setAccessState("allowed");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Ismeretlen hiba");
          setAccessState("error");
        }
      } finally {
        if (active) setLoadingOrders(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [headers, status]);

  if (loading || (session && token && accessState === "checking")) {
    return <div className="p-6 text-white">Jogosultság ellenőrzése...</div>;
  }

  if (!session || !token || accessState === "denied") {
    return (
      <main className="mx-auto max-w-xl p-6 text-white" role="alert">
        <h1 className="text-xl font-semibold">Nincs hozzáférés</h1>
        <p className="mt-2 text-sm text-white/60">
          Ez az oldal kizárólag admin/editor jogosultsággal érhető el.
        </p>
      </main>
    );
  }

  if (accessState !== "allowed") {
    return (
      <main className="mx-auto max-w-xl p-6 text-white" role="alert">
        <h1 className="text-xl font-semibold">A jogosultság nem ellenőrizhető</h1>
        <p className="mt-2 text-sm text-red-300">
          {error || "A rendelési adatok védelme érdekében az oldal nem jeleníthető meg."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 border border-white/20 px-3 py-2 text-sm hover:bg-white/5"
        >
          Újrapróbálás
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-lime-200/60">WEBÁRUHÁZ / TELJES RENDELÉSI KÖR</p>
          <h1 className="mt-2 text-2xl font-bold">Webshopos rendelések</h1>
          <p className="mt-1 text-sm text-white/50">Azok a fizetési rekordok is itt jelennek meg, amelyekhez még nincs külön operatív rendelési rekord.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/order-map" className="border border-lime-200/30 px-3 py-2 text-sm text-lime-200 hover:bg-lime-200/5">
            Kézbesítési térkép →
          </Link>
          <Link href="/admin/orders" className="border border-white/20 px-3 py-2 text-sm text-lime-200 hover:bg-white/5">
            Operatív rendelések →
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm text-white/60">
          Státusz
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="border border-white/20 bg-black px-3 py-2 text-white">
            <option value="all">Mind</option>
            <option value="paid">Fizetve</option>
            <option value="pending">Fizetésre vár</option>
            <option value="payment_failed">Sikertelen fizetés</option>
            <option value="canceled">Törölve</option>
          </select>
        </label>
        <p className="text-xs text-white/40">{orders.length} rendelés megjelenítve</p>
      </div>

      {error ? <div role="alert" className="border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</div> : null}

      <div className="overflow-x-auto border border-white/15 bg-black/30">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.14em] text-white/50">
            <tr>
              <th className="px-3 py-3">Rendelés</th>
              <th className="px-3 py-3">Dátum</th>
              <th className="px-3 py-3">Vevő</th>
              <th className="px-3 py-3">Kézbesítés</th>
              <th className="px-3 py-3">Összeg</th>
              <th className="px-3 py-3">Státusz</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? <tr><td colSpan={6} className="px-3 py-6 text-white/50">Betöltés…</td></tr> : null}
            {!loadingOrders && orders.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-white/50">Nincs ilyen rendelés.</td></tr> : null}
            {orders.map((order) => {
              const method = typeof order.metadata?.deliveryMethod === "string" ? order.metadata.deliveryMethod : "";
              const pickup = typeof order.metadata?.pickupPoint === "string" ? order.metadata.pickupPoint : "";
              return (
                <tr key={order.id} className="border-t border-white/10 align-top">
                  <td className="px-3 py-3">
                    <Link href={`/admin/shop-orders/${order.id}`} className="font-mono text-lime-200 hover:underline">
                      {order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <p className="mt-1 text-[10px] text-white/30">{order.order_type}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-white/60">{new Date(order.created_at).toLocaleString("hu-HU")}</td>
                  <td className="px-3 py-3 text-white/70">{order.customer_email || "Nincs email"}</td>
                  <td className="max-w-xs px-3 py-3 text-white/60">
                    <div>{DELIVERY_LABELS[method] ?? (method.replaceAll("_", " ") || "Nincs megadva")}</div>
                    {pickup ? <p className="mt-1 text-xs text-white/35">{pickup}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-white/80">{formatAmount(order.total_amount, order.currency)}</td>
                  <td className="px-3 py-3">
                    <span className="border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.12em]">{STATUS_LABELS[order.status] ?? order.status}</span>
                    {order.user_received_at ? <p className="mt-2 text-[10px] text-lime-200/70">Vásárló átvette</p> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
