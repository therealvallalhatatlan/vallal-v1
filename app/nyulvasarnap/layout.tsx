import type { Metadata } from "next";
import type { ReactNode } from "react";



export const metadata: Metadata = {
  title: "Nyulvasarnap",
  description: "Nyulvasarnap event mini-app",
};

export default function NyulvasarnapLayout({ children }: { children: ReactNode }) {
  return <div className="font-mono">{children}</div>;
}
