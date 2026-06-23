"use client";

import { useMemo, useState } from "react";

type IdentityGeneratorProps = {
  suggestedId: string;
  errorMessage?: string;
  onSubmit: (publicId: string) => void;
};

export default function IdentityGenerator({ suggestedId, errorMessage, onSubmit }: IdentityGeneratorProps) {
  const [publicId, setPublicId] = useState(suggestedId);
  const [hasClearedSuggestedId, setHasClearedSuggestedId] = useState(false);

  const isValid = useMemo(() => {
    return /^[A-Z0-9-]{4,16}$/i.test(publicId.trim());
  }, [publicId]);

  return (
    <section className="relative w-full max-w-4xl overflow-hidden border border-white/20 bg-black px-5 py-6 text-white sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.08)_0_1px,transparent_1px_4px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0.12),rgba(255,255,255,0))] opacity-40" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="space-y-3 border-b border-white/20 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.55em] text-neutral-500">play / identity boot</p>
          <h1
            data-text="Vállalhatatlan Intergalaktikus Nyúlvasárnap"
            className="relative font-mono text-3xl uppercase leading-none tracking-[0.18em] text-white before:absolute before:inset-0 before:translate-x-[1px] before:translate-y-[-1px] before:text-neutral-500 before:content-[attr(data-text)] after:absolute after:inset-0 after:translate-x-[-1px] after:translate-y-[1px] after:text-neutral-700 after:content-[attr(data-text)] sm:text-5xl"
          >
            <span className="relative z-10">Vállalhatatlan Intergalaktikus Nyúlvasárnap</span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.6em] text-neutral-300 sm:text-sm">
            Identity Generator
          </p>
        </div>

        <div className="space-y-3 border border-white/20 p-4 sm:p-5">
          <label htmlFor="nyul-public-id" className="block font-mono text-sm uppercase tracking-[0.45em] text-white">
            Public ID
          </label>
          <input
            id="nyul-public-id"
            className="min-h-16 w-full border border-white bg-black px-4 py-3 font-mono text-xl uppercase tracking-[0.18em] text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-neutral-300 focus:text-white"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value.toUpperCase())}
            onFocus={() => {
              if (!hasClearedSuggestedId && publicId === suggestedId) {
                setPublicId("");
                setHasClearedSuggestedId(true);
              }
            }}
            placeholder="RABBIT-027"
            maxLength={16}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="font-mono text-xs leading-relaxed text-neutral-400 sm:text-sm">
            Ezt az azonosítót fogják látni a többiek a hálózaton.
          </p>
          {errorMessage ? <p className="font-mono text-xs leading-relaxed text-white sm:text-sm">{errorMessage}</p> : null}
        </div>

        <button
          type="button"
          className="min-h-16 border border-white bg-black px-4 py-3 font-mono text-base uppercase tracking-[0.35em] text-white transition-colors hover:border-neutral-400 hover:text-neutral-300 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-700"
          disabled={!isValid}
          onClick={() => onSubmit(publicId)}
        >
          [ SESSION INDITASA ]
        </button>
      </div>
    </section>
  );
}
