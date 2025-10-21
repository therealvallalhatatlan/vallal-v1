// components/LightboxTrigger.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LightboxTrigger({
  label,
  images,
}: {
  label: string;
  images: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
        onClick={() => setOpen(true)}
        data-umami-event="sample_open"
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

            <div className="space-y-3 p-2">
              {images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt="Mintaoldalak"
                  className="rounded-lg border border-lime-400/20"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
