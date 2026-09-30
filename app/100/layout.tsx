import type { ReactNode } from "react";

export default function Layout100({ children }: { children: ReactNode }) {
  return <div className="[&_*]:selection:bg-lime-300 [&_*]:selection:text-black">{children}</div>;
}
