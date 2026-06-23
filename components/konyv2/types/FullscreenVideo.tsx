'use client'

import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: fullscreen-video
 * A full-bleed looping background video with minimal centered text.
 * Pass `props.videoSrc` in data/konyv2Novellak.ts to set the video.
 */
export default function FullscreenVideo({ title, props }: Konyv2PageProps) {
  const videoSrc = typeof props?.videoSrc === 'string' ? props.videoSrc : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-900 to-black" />
      )}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-thin uppercase tracking-[0.3em] text-white/90 md:text-6xl">
          {title}
        </h1>
      </div>
    </main>
  )
}
