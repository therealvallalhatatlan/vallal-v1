import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "Next.js App",
  description: "A modern Next.js application with TypeScript and Tailwind",
  generator: "Next.js",
  keywords: ["Next.js", "TypeScript", "Tailwind CSS"],
  authors: [{ name: "Your Name" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-mono ${GeistSans.variable} ${GeistMono.variable} bg-black text-green-400 antialiased`}>
        {children}
      </body>
    </html>
  )
}
