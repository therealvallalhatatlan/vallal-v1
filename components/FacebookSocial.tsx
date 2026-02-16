"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const appId = process.env.NEXT_PUBLIC_FB_APP_ID;

export default function FacebookSocial() {
  const pathname = usePathname();
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(pathname, window.location.origin).toString();
    setUrl(nextUrl);
  }, [pathname]);

  useEffect(() => {
    if (!url) {
      return;
    }

    const fb = (window as typeof window & { FB?: { XFBML?: { parse: () => void } } }).FB;
    if (fb?.XFBML?.parse) {
      fb.XFBML.parse();
    }
  }, [url]);

  if (!appId || !url) {
    return null;
  }

  return (
    <div className="mt-10 space-y-6 rounded-2xl border border-neutral-300/40 dark:border-neutral-700/60 bg-white/40 dark:bg-black/40 p-6">
      <div className="fb-like" data-href={url} data-width="" data-layout="standard" data-action="like" data-size="small" data-share="true" />
      <div className="fb-comments" data-href={url} data-width="100%" data-numposts="5" data-order-by="social" />
    </div>
  );
}
