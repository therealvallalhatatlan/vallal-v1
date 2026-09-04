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
  {
    label: "Reddit",
    value: "@Evening-Fix6337",
    href: "https://www.reddit.com/r/vallalhatatlan/",
  },
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M3.5 6.5h17v11h-17zM4 7l8 6 8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5.5 5.5h13A2.5 2.5 0 0 1 21 8v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3H5.5A2.5 2.5 0 0 1 3 15V8a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8M8 13h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <rect x="8" y="8" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M13 5h6v6M19 5l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 13v4.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LabContact() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Email copy failed", error);
    }
  };

  return (
    <section
      className="border-y border-zinc-800/70 py-6"
      style={{ fontFamily: "var(--font-mono-tech)" }}
      aria-label="Kapcsolat"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            title="Email cím másolása"
            aria-label="Email cím másolása"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-700/80 px-3 text-xs uppercase tracking-[0.16em] text-zinc-300 transition-all hover:border-lime-300/60 hover:text-lime-200"
          >
            <CopyIcon />
            <span>{copied ? "Másolva!" : "Emailcím másolása"}</span>
          </button>

          <a
            href="/kapcsolat"
            title="Kapcsolat oldal megnyitása"
            aria-label="Kapcsolat oldal megnyitása"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-lime-100/70 px-3 text-xs uppercase tracking-[0.16em] text-lime-100 transition-all hover:bg-lime-300/10 hover:border-lime-200"
          >
            <ChatIcon />
            <span>Küldj üzenetet</span>
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CONTACT_LINKS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex h-8 items-center gap-2 bg-zinc-950/30 px-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-lime-300/50 hover:text-lime-200"
          >
            <span>{item.label}</span>
            <span className="opacity-40 transition-opacity group-hover:opacity-80">
              <ExternalIcon />
            </span>
          </a>
        ))}
      </div>

      {copied && (
        <span className="sr-only" role="status">
          Email cím kimásolva.
        </span>
      )}
    </section>
  );
}
