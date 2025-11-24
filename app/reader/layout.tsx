import type { ReactNode } from "react";

export default function ReaderLayout({ children }: { children: ReactNode }) {
return (
<div className="min-h-dvh text-neutral-500 transition-colors bg-[url('/reader-bg.png')] bg-cover bg-center bg-fixed overflow-x-hidden" style={{ touchAction:'pan-y' }}>
{children}
</div>
);
}