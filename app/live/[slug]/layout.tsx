// app/live/[slug]/layout.tsx

import { ReactNode } from "react";
import { Crimson_Pro, Inter } from "next/font/google";
import { Special_Elite } from "next/font/google";

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-reader",
});

const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-heading" });

export default function LiveSlugLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${crimson.variable} ${inter.variable} ${specialElite.variable} antialiased overflow-x-hidden`}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}
