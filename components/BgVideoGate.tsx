"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

export default function BgVideoGate() {
  const pathname = usePathname() || "/";

  const shouldRender = useMemo(() => {
    // Reader and AR should be as light as possible
    return !(
      pathname === "/reader" || 
      pathname.startsWith("/reader/") || 
      pathname === "/ar" || 
      pathname.startsWith("/ar/") ||
      pathname.startsWith("/public-story/")
    );
  }, [pathname]);

  useEffect(() => {
    if (!shouldRender) return;

    const video = document.getElementById("bg-video") as HTMLVideoElement | null;
    if (!video) return;

    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    const onVis = () => {
      if (document.hidden) {
        try {
          video.pause();
        } catch {}
      } else {
        attemptPlay();
      }
    };

    attemptPlay();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="bg-video fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <video
        id="bg-video"
        className="bg-video__media w-full h-full object-cover"
        src="/videos/video1.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="bg-video__overlay absolute inset-0" />
    </div>
  );
}
