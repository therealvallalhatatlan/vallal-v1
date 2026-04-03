import React from 'react';

export default function CRTOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 mix-blend-screen opacity-60 select-none"
      style={{
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)',
        backdropFilter: 'blur(0.5px) contrast(1.1)',
      }}
    >
      {/* Extra: animated flicker, chromatic aberration, grain overlays can be added here */}
    </div>
  );
}
