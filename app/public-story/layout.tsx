import type { ReactNode } from "react";

export default function PublicStoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-neutral-900 transition-colors">
      {children}
    </div>
  );
}
