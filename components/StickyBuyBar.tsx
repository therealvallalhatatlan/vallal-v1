// components/StickyBuyBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSequence } from "@/lib/format";

export default function StickyBuyBar({
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
            data-umami-event="sticky_buy_click"
            disabled={soldOut}
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
