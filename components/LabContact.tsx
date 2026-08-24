"use client";

import { useState } from "react";

const EMAIL_ADDRESS = "therealvallalhatatlan@gmail.com";

const CONTACT_LINKS = [
  {
    label: "Facebook",
    value: "facebook.com/vallalhatatlan2000",
    href: "https://www.facebook.com/vallalhatatlan2000",
  },
  {
    label: "Substack",
    value: "vallalhatatlan.substack.com",
    href: "https://vallalhatatlan.substack.com/",
  },
  {
    label: "Revolut",
    value: "@vallalhatatlan",
    href: "https://www.revolut.com/hu-HU/",
  },
];

export default function LabContact() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator?.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Email copy failed", error);
    }
  };

  return (
    <section className="mt-6" style={{ fontFamily: "var(--font-mono-tech)" }}>
      <div className="flex flex-col gap-4 rounded-md border border-zinc-900 bg-zinc-900/90 p-5 text-zinc-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">Elektronikus Levél</p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full border-2 border-lime-100/60 px-5 py-4 text-sm uppercase tracking-[0.15em] text-lime-200 transition-colors hover:bg-lime-400/10"
          aria-label="Másold a kapcsolat email címét"
          onClick={handleCopy}
        >
          <span>{copied ? "Nyomassuk barátom!" : "therealvallalhatatlan@gmail.com"}</span>
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 2.5H9.5C10.3284 2.5 11 3.17157 11 4V12.5H12.5C13.3284 12.5 14 13.1716 14 14V14.5H4C3.17157 14.5 2.5 13.8284 2.5 13V3.5H3V2.5Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              x="2"
              y="3"
              width="9"
              height="9"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>

      <div className="mt-6 grid gap-3 text-[11px] text-zinc-300">
        {CONTACT_LINKS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-sm border border-zinc-900/60 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-lime-400/50"
          >
            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">{item.label}</span>
            <span className="text-sm text-lime-200">{item.value}</span>
          </a>
        ))}
      </div>
    </section>
  );
}