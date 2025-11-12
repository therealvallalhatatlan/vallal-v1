import type { ReactNode } from "react";


export default function ReaderLayout({ children }: { children: ReactNode }) {
return (
<div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)] transition-colors">
{children}
</div>
);
}