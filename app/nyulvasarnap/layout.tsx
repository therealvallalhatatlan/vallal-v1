import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import type { ReactNode } from "react";

const vt323 = VT323({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-nyul-vt323",
});

export const metadata: Metadata = {
  title: "Nyulvasarnap",
  description: "Nyulvasarnap event mini-app",
};

export default function NyulvasarnapLayout({ children }: { children: ReactNode }) {
  return <div className={vt323.variable}>{children}</div>;
}
