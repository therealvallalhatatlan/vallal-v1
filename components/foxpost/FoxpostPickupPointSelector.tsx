"use client";

import { useEffect, useRef } from "react";
import { parseFoxpostPickupPoint } from "@/lib/foxpost";
import type { FoxpostPickupPoint } from "@/types/foxpost";

type FoxpostPickupPointSelectorProps = {
  onChange: (point: FoxpostPickupPoint) => void;
};

const FOXPOST_WIDGET_URL =
  "https://cdn.foxpost.hu/apt-finder/v1/app/?lang=hu&theme=dark";

const FOXPOST_ORIGINS = new Set([
  "https://cdn.foxpost.hu",
  "https://foxpost.hu",
]);

export function FoxpostPickupPointSelector({
  onChange,
}: FoxpostPickupPointSelectorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    function receiveFoxpostMessage(event: MessageEvent) {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      if (!FOXPOST_ORIGINS.has(event.origin)) return;

      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      const selectedPoint = parseFoxpostPickupPoint(payload);
      if (!selectedPoint) return;

      onChangeRef.current(selectedPoint);
    }

    window.addEventListener("message", receiveFoxpostMessage);
    return () => window.removeEventListener("message", receiveFoxpostMessage);
  }, []);

  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-zinc-800 bg-black">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100">
            FOXPOST átvételi pont kereső
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
            Keress a térképen vagy a listában, majd kattints a „Kiválasztom” gombra.
          </p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.16em] text-lime-100/60">
          FOXPOST / PACKETA
        </span>
      </div>
      <iframe
        ref={iframeRef}
        src={FOXPOST_WIDGET_URL}
        title="FOXPOST csomagautomata és átvételi pont választó"
        loading="lazy"
        allow="geolocation"
        className="block h-[560px] w-full bg-zinc-950"
        style={{ border: 0 }}
      />
    </div>
  );
}
