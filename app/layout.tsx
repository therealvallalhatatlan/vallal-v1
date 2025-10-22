import type React from "react"
import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL("https://vallalhatatlan.online"),
  title: {
    default: "Vállalhatatlan — Y2K | Budapest underground a ’90-es évekből",
    template: "%s | Vállalhatatlan",
  },
  description:
    "Vállalhatatlan — Y2K: nyers, urbánus novellák a ’90-es évek és az ezredforduló Budapestjéről. Rave/techno éjszakák, underground szcénák, drogkultúra, identitásválság és könyörtelen őszinteség.",
  keywords: [
    // Hungarian focus
    "Vállalhatatlan",
    "Y2K",
    "’90-es évek",
    "kilencvenes évek",
    "Budapest underground",
    "rave kultúra",
    "techno",
    "acid",
    "drogok",
    "fű",
    "illegális szerek",
    "partikultúra",
    "kortárs irodalom",
    "novelláskötet",
    "sötét urbánus próza",
    // English support
    "Budapest 1990s",
    "Y2K fiction",
    "underground culture",
    "rave techno",
    "drug culture literature",
    "urban fiction",
  ],
  alternates: {
    languages: {
      "hu-HU": "/",
      // "en-US": "/en", // remove until /en exists
    },
  },
  openGraph: {
    type: "book",
    url: "/",
    siteName: "Vállalhatatlan",
    title: "Vállalhatatlan — Y2K | Underground Budapest a ’90-es évekből",
    description:
      "Nyers, sötét humorú novellák a ’90-es évek/ezredforduló Budapestjéről: techno, acid, rave, drogkultúra és töréspontok.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Vállalhatatlan — Y2K könyv: Budapest underground, techno és ’90-es évek",
      },
    ],
    locale: "hu_HU",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan — Y2K",
    description:
      "Underground Budapest a ’90-es években: rave/techno, drogkultúra és kíméletlenül őszinte novellák.",
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5a3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (

    <html lang="en" className="dark">
      <body className={`font-mono ${GeistSans.variable} ${GeistMono.variable} bg-black text-green-400 antialiased`}>


        <div className="bg-video" aria-hidden="true">
          <video
            className="bg-video__media"
            src="/video.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="bg-video__overlay" />
        </div>   

        {/* --- 90s CRT overlays (updated) --- */}
        <div aria-hidden="true" className="fx-bands fixed inset-0 pointer-events-none" />
        <div aria-hidden="true" className="fx-stripes fixed inset-0 pointer-events-none" />
        <div aria-hidden="true" className="fx-vignette fixed inset-0 pointer-events-none" />
        <div aria-hidden="true" className="fx-vhs fixed inset-0 pointer-events-none" /> {/* <-- LEGYEN A LEGUTOLSÓ */}



        {/* Page content above video */}
        <div className="content-above relative z-20">

          {children}
          <Analytics />
          <SpeedInsights/>
        </div>

        {/* JSON-LD: Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Vállalhatatlan',
              url: 'https://vallalhatatlan.online',
              sameAs: [
                'https://www.reddit.com/r/vallalhatatlan/',
                'https://www.facebook.com/vallalhatatlan2000',
                'mailto:hello@vallalhatatlan.online'
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Vállalhatatlan',
              url: 'https://vallalhatatlan.online',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://vallalhatatlan.online/search?q={query}',
                'query-input': 'required name=query'
              }
            })
          }}
        />
      </body>
    </html>

  )
}
