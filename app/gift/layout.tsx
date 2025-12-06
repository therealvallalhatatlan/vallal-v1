import type { ReactNode } from "react";

export default function GiftLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* ...existing content... */}
      {children}
    </div>
  );
}
