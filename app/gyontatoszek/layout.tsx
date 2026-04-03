import type { ReactNode } from 'react';

export default function GyontatoszekLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Fullscreen GIF background */}
      <div
        className="fixed inset-0 z-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: "url('/husvet.gif')" }}
        aria-hidden="true"
      />
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-10 bg-black/80 pointer-events-none" aria-hidden="true" />
      {/* Page content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  );
}
