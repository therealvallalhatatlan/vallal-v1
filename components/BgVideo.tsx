"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BgVideo({
  mp4 = "/video.mp4",
  webm = "/video.webm",
  poster = "/video-poster.jpg",
  className = "",
}: {
  mp4?: string;
  webm?: string;
  poster?: string;
  className?: string;
}) {
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;

    // próbáljuk elindítani; ha elutasítják, újrapróbáljuk úgy, hogy muted = true
    const attemptPlay = async () => {
      try {
        const p = v.play();
        if (p) {
          await p;
          setIsPlaying(true);
        } else {
          setIsPlaying(!v.paused);
        }
      } catch (err) {
        // ha nem megy, mute-oljuk és újrapróbáljuk
        try {
          v.muted = true;
          await v.play();
          setIsPlaying(true);
        } catch (err2) {
          console.warn("BgVideo: play failed:", err2);
          setFailed(true);
        }
      }
    };

    // Ha már betöltődött a metadata, próbáljuk
    if (document.readyState === "complete") {
      attemptPlay();
    } else {
      window.addEventListener("load", attemptPlay, { once: true });
    }

    // cleanup
    return () => {
      window.removeEventListener("load", attemptPlay as EventListener);
    };
  }, []);

  // ha a videó hibát jelez
  const onError = () => {
    setFailed(true);
  };

  // ha a videó elindult, false → true
  const onPlaying = () => setIsPlaying(true);

  return (
    <div
      className={`bg-video fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {!failed ? (
        <video
          ref={vidRef}
          className="bg-video__media w-full h-full object-cover"
          // források:
          playsInline
          muted
          autoPlay
          loop
          preload="auto"
          onError={onError}
          onPlaying={onPlaying}
          // poster csak fallbackként, ha a videó nem töltődik (img fallback jobban működik)
          poster={poster}
        >
          {webm && <source src={webm} type="video/webm; codecs='vp9,opus'" />}
          {mp4 && <source src={mp4} type="video/mp4; codecs='avc1.42E01E, mp4a.40.2'" />}
          {/* ha sehogy se megy, a fallback szöveg jelenik meg */}
          Your browser does not support the video tag.
        </video>
      ) : (
        // fallback: background kép, ha a videó hibázik
        <div
          className="absolute inset-0 w-full h-full bg-center bg-cover"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}

      <div className="bg-video__overlay absolute inset-0 pointer-events-none" />
      <style jsx>{`
        .bg-video { position: fixed; inset: 0; overflow: hidden; }
        .bg-video__media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 1; pointer-events: none; }
        .bg-video__overlay { position: absolute; inset: 0; background: radial-gradient(circle at 50% 20%, rgba(0,0,0,0.2), transparent 55%), linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.75)); }
      `}</style>
    </div>
  );
}
