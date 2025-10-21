"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSequence } from "@/lib/format";

export function track(event: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined" && (window as any).umami) {
    try { (window as any).umami.track(event, params); } catch {}
  }
  if (typeof window !== "undefined" && (window as any).gtag) {
    try { (window as any).gtag("event", event, params); } catch {}
  }
}

export function LightboxTrigger({
  children,
  label,
  onOpen,
}: {
  children: React.ReactNode;
  label: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open && onOpen) onOpen(); }, [open, onOpen]);

  return (
    <>
      <Button
        variant="outline"
        className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-3xl w-full bg-black border border-lime-400/30 rounded-xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-lime-300">Minta – első 8 oldal</div>
              <button
                className="text-lime-400 hover:text-lime-200"
                onClick={() => setOpen(false)}
                aria-label="Bezárás"
              >
                ✕
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export function SampleLightbox() {
  return (
    <div className="flex items-center gap-3">
      <LightboxTrigger
        label="Lapozz bele (8 oldal)"
        onOpen={() => track("sample_open")}
      >
        <div className="space-y-3 p-2">
          <img src="/sample/pages-1-4.png" alt="Mintaoldalak" className="rounded-lg border border-lime-400/20" />
          <img src="/sample/pages-5-8.png" alt="Mintaoldalak" className="rounded-lg border border-lime-400/20" />
        </div>
      </LightboxTrigger>
    </div>
  );
}

export function PrimeCTA({ soldOut }: { soldOut: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        asChild
        size="lg"
        className="border-lime-400 text-lime-900 bg-lime-400 hover:bg-lime-300 hover:text-black"
        onClick={() => track("hero_buy_click")}
        disabled={soldOut}
      >
        <Link href={soldOut ? "#" : "/checkout"}>
          Sorszám lefoglalása – {formatCurrency(15000)}
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black">
        <Link href="/konyv">Mi ez?</Link>
      </Button>
    </div>
  );
}

export function StickyBuyBar({
  soldOut,
  price,
  sequence,
  percent,
}: {
  soldOut: boolean;
  price: number;
  sequence: number;
  percent: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-transform ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="m-3 rounded-2xl border border-lime-400/30 bg-black/85 p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-lime-300/80">
            <div className="font-semibold text-lime-200">#{formatSequence(sequence)}</div>
            <div>{percent}% funded</div>
          </div>
          <Button
            asChild
            size="sm"
            className="border-lime-400 text-black bg-lime-400 hover:bg-lime-300"
            disabled={soldOut}
            onClick={() => track("sticky_buy_click")}
          >
            <Link href={soldOut ? "#" : "/checkout"}>
              Sorszám lefoglalása – {formatCurrency(price)}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
