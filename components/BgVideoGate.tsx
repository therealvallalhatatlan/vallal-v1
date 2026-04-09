"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export default function BgVideoGate() {
  const pathname = usePathname() || "/";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const shouldRender = useMemo(() => {
    // Reader, AR, and Admin should be as light as possible / no video background
    return !(
      pathname === "/reader" || 
      pathname.startsWith("/reader/") || 
      pathname === "/ar" || 
      pathname.startsWith("/ar/") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/public-story/")
    );
  }, [pathname]);

  const videoSrc = useMemo(() => {
    if (pathname === "/konyv-2") {
      return isMobile ? "/videos/video3_vertical.mp4" : "/videos/video3.mp4";
    }
    return "/videos/bg.mp4";
  }, [pathname, isMobile]);

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
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="bg-video__overlay absolute inset-0 pointer-events-none" />
    </div>
  );
}
