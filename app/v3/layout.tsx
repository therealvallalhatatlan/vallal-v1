import type { ReactNode } from 'react';

export default function V3Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden ">
      <div
        className="fixed inset-0 z-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url('/ai-bg.gif')" }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-10 bg-black/40 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen items-center justify-center">{children}</div>
    </div>
  );
}
