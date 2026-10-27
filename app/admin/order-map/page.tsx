"use client";

import Link from "next/link";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import AdminFulfillmentMap from "@/components/orders/AdminFulfillmentMap";

export default function AdminOrderMapPage() {
  const { session, loading } = useSessionGuard();
  const token = (session as any)?.access_token as string | undefined;

  if (loading) return <div className="p-6 text-white">Betöltés...</div>;
  if (!session) return <div className="p-6 text-white">Jelentkezz be admin/editor jogosultsággal.</div>;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-lime-200/60">VÁLLALHATATLAN / LOGISZTIKA</p>
          <h1 className="mt-2 text-2xl font-bold">Kézbesítési térkép</h1>
          <p className="mt-1 text-sm text-white/45">Csak a vásárlóval már egyeztetett és feloldott dead-drop helyszínek.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/orders" className="border border-white/20 px-3 py-2 text-sm text-lime-200 hover:bg-white/5">Operatív rendelések</Link>
          <Link href="/admin/shop-orders" className="border border-white/20 px-3 py-2 text-sm text-lime-200 hover:bg-white/5">Webshopos rendelések</Link>
        </div>
      </header>
      <AdminFulfillmentMap token={token ?? null} />
    </main>
  );
}
