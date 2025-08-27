"use client";
import React from "react";
import { getPaymentMode, getPaymentLinkUrl } from "@/lib/config";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function CheckoutButton({ className = "", children }: Props) {
  const mode = getPaymentMode(); // 'link' (default) or 'api'
  const link = getPaymentLinkUrl();
  const [loading, setLoading] = React.useState(false);
  async function handleClick() {
    try {
      setLoading(true);
      if (mode === "link" && link) {
        window.location.href = link; // Stripe-hosted Checkout
        return;
      }
      // Fallback to API flow if explicitly set:
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      if (!res.ok) throw new Error("Checkout init failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      alert("Payment could not be initiated. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || "group inline-flex w-full items-center justify-center rounded-2xl border border-emerald-400 px-5 py-3 text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-60"}
    >
      {children ?? (loading ? "Redirecting…" : "Proceed to payment")}
    </button>
  );
}
