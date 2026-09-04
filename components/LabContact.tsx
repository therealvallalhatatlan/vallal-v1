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
    <section className="mt-6 mb-6" style={{ fontFamily: "var(--font-mono-tech)" }}>
      <div className="flex flex-col gap-4 rounded-md bg-transparent pb-6 pt-6 text-zinc-100 sm:flex-row sm:items-center sm:justify-between">

        <button
          type="button"
          className="flex items-center justify-between gap-2 rounded-full border-2 border-lime-100/60 px-5 py-4 text-sm tracking-normal text-lime-200 transition-colors hover:bg-lime-400/10"
          aria-label="Másold a kapcsolat email címét"
          onClick={handleCopy}
        >
          <span>{copied ? "Emailcím kimásolva! Nyomassuk barátom!" : "therealvallalhatatlan@gmail.com"}</span>
          <span>@</span>
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