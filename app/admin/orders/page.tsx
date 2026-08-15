"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/useSessionGuard";

type AdminOrder = {
  id: string;
  created_at: string;
  product_id: string;
  amount: number;
  currency: string;
  status: string;
  delivery_type: string;
  customer_email: string | null;
  telegram_chat_id: string | null;
};

const DEFAULT_STATUS_FILTER = "paid,ready_to_dispatch,dispatched";

export default function AdminOrdersPage() {
  const { session, loading } = useSessionGuard();
  const token = (session as any)?.access_token as string | undefined;

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  useEffect(() => {
    if (!headers) return;

    const loadOrders = async () => {
      setLoadingOrders(true);
      setError(null);
      try {
        const params = new URLSearchParams({ status: statusFilter, limit: "100" });
        const response = await fetch(`/api/admin/orders?${params.toString()}`, { headers });
        if (!response.ok) {
          throw new Error("Nem sikerült lekérni a rendeléseket.");
        }

        const payload = (await response.json()) as { orders?: AdminOrder[] };
        setOrders(payload.orders ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ismeretlen hiba");
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrders();
  }, [headers, statusFilter]);

  if (loading) {
    return <div className="p-6 text-white">Betöltés...</div>;
  }

  if (!session) {
    return <div className="p-6 text-white">Jelentkezz be admin/editor jogosultsággal.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Orders Queue</h1>
        <Link href="/admin" className="text-sm text-lime-300 hover:underline">
          Vissza az adminhoz
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="statusFilter" className="text-sm text-white/70">
          Státusz szűrő
        </label>
        <input
          id="statusFilter"
          className="w-full max-w-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          placeholder="paid,ready_to_dispatch,dispatched"
        />
      </div>

      {error ? <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

      <div className="overflow-x-auto rounded border border-white/15 bg-black/30">
        <table className="min-w-full text-sm">
          <thead className="bg-black/40 text-left text-white/70">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr>
                <td className="px-3 py-4 text-white/60" colSpan={6}>
                  Rendelések betöltése...
                </td>
              </tr>
            ) : null}

            {!loadingOrders && orders.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-white/60" colSpan={6}>
                  Nincs találat a kiválasztott státuszokra.
                </td>
              </tr>
            ) : null}

            {orders.map((order) => (
              <tr key={order.id} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <Link href={`/admin/orders/${order.id}`} className="text-lime-300 hover:underline">
                    {order.id.slice(0, 8)}...
                  </Link>
                </td>
                <td className="px-3 py-2 text-white/70">{new Date(order.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="px-3 py-2">{order.product_id}</td>
                <td className="px-3 py-2">
                  {order.amount} {(order.currency || "huf").toUpperCase()}
                </td>
                <td className="px-3 py-2 text-white/70">
                  {order.telegram_chat_id ? `tg:${order.telegram_chat_id}` : order.customer_email || "n/a"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
