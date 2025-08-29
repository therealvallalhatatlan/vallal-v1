import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GlitchText } from "@/components/GlitchText"
import { CRTFrame } from "@/components/CRTFrame"
import Link from "next/link"
import type { Metadata } from "next"
import { faqData } from "@/lib/mocks"
import { formatCurrency, formatSequence } from "@/lib/format"
import path from "path"
import fs from "fs/promises"

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
    canonical: "/",
    languages: {
      "hu-HU": "/",
      "en-US": "/en",
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
  themeColor: "#0ea5a3",
};

async function readCountersSupabase() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  try {
    const resp = await fetch(`${url}/rest/v1/counters?id=eq.main`, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      // ensure we always fetch fresh data (no stale cached response)
      cache: "no-store",
    })
    if (!resp.ok) {
      console.warn("[PAGE] Supabase GET failed:", resp.status, await resp.text())
      return null
    }
    const json = await resp.json()
    if (json && json[0]) {
      const row = json[0]
      return {
        goal: Number(row.goal ?? 100),
        // return canonical production fields
        total_sold: Number(row.total_sold ?? row.preorders ?? 0),
        last_sequence_number: Number(row.last_sequence_number ?? 0),
      }
    }
    return null
  } catch (err) {
    console.error("[PAGE] Supabase fetch error:", err)
    return null
  }
}

async function readCountersFile() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    const json = JSON.parse(raw)
    return {
      goal: Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100,
      // prefer total_sold, fallback to legacy preorders
      total_sold: Number.isFinite(Number(json.total_sold ?? json.preorders)) ? Math.max(0, Number(json.total_sold ?? json.preorders)) : 0,
      last_sequence_number: Number.isFinite(Number(json.last_sequence_number ?? 0)) ? Math.max(0, Number(json.last_sequence_number ?? 0)) : 0,
    }
  } catch (err) {
    // fallback defaults
    return { goal: 100, total_sold: 0, last_sequence_number: 0 }
  }
}

async function readCounters() {
  // prefer Supabase
  const sup = await readCountersSupabase()
  if (sup) return { goal: sup.goal, total_sold: sup.total_sold, last_sequence_number: sup.last_sequence_number }
  return readCountersFile()
}

export default async function HomePage() {
  const { goal, total_sold, last_sequence_number } = await readCounters()
  const preorders = Math.min(total_sold ?? 0, goal)
  const remaining = Math.max(0, goal - preorders)
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null
  const percent = Math.min(100, Math.max(0, Math.round((preorders / goal) * 100)))
  const soldOut = remaining === 0

  return (
    <Container className="py-12 space-y-12">
      {/* Hero Section */}
      <CRTFrame intensity="subtle">
        <Card className="relative overflow-hidden">
          {/* Main heading with glitch effect */}
          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-green-400">
                <GlitchText intensity="subtle">Vállalhatatlan</GlitchText>
              </h1>
            </div>

            {/* Description text */}
            <div className="space-y-4 text-center">
              <p className="text-green-300/80 text-lg leading-relaxed">
                Ez nem egy könyv. Nem kapható a boltokban. 
                Elrejtem, és te megtalálod.  <GlitchText intensity="subtle">Összesen {goal} példány készül.</GlitchText> <br />
                Ha elfogynak, vége a játéknak. 
              </p>
              <img
                className="w-full max-w-full block h-auto object-cover"
                src="/vallalhatatlan.png"
                alt=""
              />
              <p className="text-green-300/80 text-xs leading-relaxed">
                A könyv egyedi, limitált darabszámú, számozott példány lesz.
                Várhatóan 4-6 héten belül kerül legyártásra, és megkezdem a gyártást amint elérünk 10 db előrendelést.
                Ha nem érem el ezt a célt, akkor minden befizetett összeget visszatérítek 5-7 munkanapon belül.
              </p>
            </div>

            {/* Campaign Progress */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-green-400 text-center">
                <GlitchText intensity="subtle">Találd Meg A Tiédet</GlitchText>
              </h2>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{preorders}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Előrendelések</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{goal}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Összes Példány</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">
                    {soldOut ? "—" : `#${formatSequence(yourNumber ?? 1)}`}
                  </div>
                  <div className="text-green-300/60 text-xs lg:text-sm">A Te Sorszámod</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-green-300/80">
                  <span>{percent}% funded</span>
                  <span>{remaining} remaining</span>
                </div>
                <div className="w-full bg-green-900/30 rounded-full h-3">
                  <div
                    className="bg-green-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CTA Button with hover glitch effect */}
            <div className="pt-4 text-center">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black text-xl px-8 py-4 w-full bg-transparent transition-all duration-200 hover:skew-x-1 hover:animate-pulse"
                disabled={soldOut}
              >
                <Link href={soldOut ? "#" : "/checkout"}>
                  {soldOut
                    ? "Sold out"
                    : `Szerezd meg ezt: #${formatSequence(yourNumber ?? 1)} – ${formatCurrency(15000)}`}
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </CRTFrame>

      {/* How It Works */}
      <CRTFrame intensity="subtle">
        <Card>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 text-center">Így Működik</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  1
                </div>
                <h3 className="text-lg font-semibold text-green-300">Fizetés</h3>
                <p className="text-green-300/70 text-xs">
                  Biztosítsd a saját példányod - csak 100db készül. Ha elfogy, vége.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  2
                </div>
                <h3 className="text-lg font-semibold text-green-300">Visszaigazolás</h3>
                <p className="text-green-300/70 text-xs">
                  Megkapod az egyedi sorszámodat és a visszaigazolást. Élőben követheted a haladást.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  3
                </div>
                <h3 className="text-lg font-semibold text-green-300">Dead drop</h3>
                <p className="text-green-300/70 text-xs">
                  Kapsz egy jelzést. A könyved egy elrejtett helyen vár. Odamész, megtalálod.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </CRTFrame>

      {/* New informational card below "Így Működik" */}
      <CRTFrame intensity="subtle">
        <Card>
          <div className="space-y-4 text-center">
            <h3 className="text-2xl font-bold text-green-400">Miért 15K?</h3>
            <p className="text-green-300/80 text-sm leading-relaxed max-w-2xl mx-auto">
               Független kiadás, sorszámozott, limitált példányszámban, minőségi anyagokkal. A pénz a papírba, a nyomdába és az élménybe megy.
              <br/><br/>A kötetben sosem publikált fotók és művészi illusztrációk vannak. 
              Minden fejezet QR-kódokat rejt amikkel további szövegek, playlistek, bizonyítékok, webarchívumok nyílnak.
              <br/><br/>A kézbesítés dead drop: koordináta + jel + rejtek. Biztonságos, de adrenalindús keresés. Nem szívatás, kaland.
              <br/><br/>Ha soknak tűnik egy „sima könyvért”, igazad van: ez nem sima könyv - ezzel belépsz a történetbe. 
              <br/><br/>Ezz egy egész estés városi performansz, amire örökké emlékezni fogsz, kiteheted a polcodra, 
              és ha valaki megkérdezi, hogy mi az, csak annyit mondasz: vállalhatatlan.
            </p>
          </div>
        </Card>
      </CRTFrame>

      {/* FAQ Section */}
      <CRTFrame intensity="subtle">
        <Card>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 text-center">Gy.I.K.</h2>

            <Accordion type="single" collapsible className="space-y-2">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-green-400/20">
                  <AccordionTrigger className="text-green-300 hover:text-green-400 text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-green-300/80">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Card>
      </CRTFrame>

      {/* Footer Links */}
      <Card>
        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/terms" className="text-green-300/60 hover:text-green-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-green-300/60 hover:text-green-400 transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p className="text-green-300/40 text-xs">© 2025 First Vallalhatatlan Campaign. All rights reserved.</p>
        </div>
      </Card>
    </Container>
  )
}
