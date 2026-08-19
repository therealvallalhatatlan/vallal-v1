"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume, VolumeX } from "lucide-react";

export default function VideoPlayer({ src = "/videos/vmfi.mp4" }: { src?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const onTime = () => {
      if (!v || !v.duration) return;
      setProgress((v.currentTime / v.duration) * 100);
    };

    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  // Attempt to autoplay muted on mount so video starts automatically.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    // Try to play; browsers may block autoplay if not muted.
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, []);

  const togglePlay = async () => {
    const v = ref.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    } catch (e) {
      // autoplay may be blocked
    }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full relative overflow-hidden bg-black"
    >
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-cover"
        playsInline
        muted={muted}
        loop
        preload="metadata"
        autoPlay
      />

      {/* CRT scanline overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 fx-stripes opacity-60" />

      {/* VHS subtle sweep */}
      <div className="pointer-events-none absolute inset-0 z-30 fx-vhs opacity-70" />

      {/* Controls: play/pause and progress. No volume control (video is muted). */}
      <div className="absolute left-4 right-4 bottom-4 z-40 flex items-center gap-4">
        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
          className="inline-flex items-center justify-center w-12 h-10 rounded-md bg-black/40 text-lime-400 hover:bg-black/30 transition"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
          <div className="h-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.6)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* subtle vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 fx-vignette" />
    </motion.div>
  );
}
