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
  title: "Support the Print - Crowdfunding Campaign",
  description:
    "Help us bring this amazing book to life. Support our crowdfunding campaign and be part of something special.",
  openGraph: {
    title: "Support the Print - Crowdfunding Campaign",
    description:
      "Help us bring this amazing book to life. Support our crowdfunding campaign and be part of something special.",
    type: "website",
  },
}

async function readCountersFile() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    const json = JSON.parse(raw)
    return {
      goal: Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100,
      preorders: Number.isFinite(Number(json.preorders)) ? Math.max(0, Number(json.preorders)) : 0,
    }
  } catch (err) {
    // fallback defaults
    return { goal: 100, preorders: 0 }
  }
}

export default async function HomePage() {
  const { goal, preorders } = await readCountersFile()
  const cappedPreorders = Math.min(preorders, goal)
  const remaining = Math.max(0, goal - cappedPreorders)
  const nextSequence = Math.min(goal, cappedPreorders + 1)
  const percent = Math.min(100, Math.max(0, Math.round((cappedPreorders / goal) * 100)))
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
                <GlitchText intensity="subtle">Access the Drop</GlitchText>
              </h1>
            </div>

            {/* Description text */}
            <div className="space-y-4 text-center">
              <p className="text-green-300/80 text-lg leading-relaxed">
                Ez nem egy könyv. Nem kapható a boltokban. 
                Csak {goal} példány készül. Elrejtem, és neked meg kell találnod. 
                Ha elfogynak, vége a játéknak. 
              </p>
              <p className="text-green-300/80 text-xs leading-relaxed">
                A könyv egyedi, számozott példány lesz, amit csak a kampány támogatóinak készítek el.
                A könyv várhatóan 6-8 héten belül kerül legyártásra, és megkezdődik amint elértünk {goal} előrendelést.
                Ha nem érjük el a célt, minden befizetett összeget visszatérítünk 5-7 munkanapon belül.
              </p>
            </div>

            {/* Campaign Progress */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-green-400 text-center">
                <GlitchText intensity="subtle">Campaign Progress</GlitchText>
              </h2>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{cappedPreorders}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Előrendelések</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{goal}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Összes Példány</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">
                    {soldOut ? "—" : formatSequence(nextSequence)}
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
                <Link href={soldOut ? "#" : "/checkout"}>{soldOut ? "Sold out" : `Support the print – ${formatCurrency(15000)}`}</Link>
              </Button>
            </div>
          </div>
        </Card>
      </CRTFrame>

      {/* How It Works */}
      <CRTFrame intensity="subtle">
        <Card>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 text-center">How It Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  1
                </div>
                <h3 className="text-lg font-semibold text-green-300">Pay</h3>
                <p className="text-green-300/70 text-sm">
                  Support the campaign with your preorder payment. Your contribution helps us reach our printing goal.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  2
                </div>
                <h3 className="text-lg font-semibold text-green-300">Confirmation</h3>
                <p className="text-green-300/70 text-sm">
                  Receive your unique sequence number and confirmation. Track the campaign progress in real-time.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-400 text-black rounded-full flex items-center justify-center font-bold text-xl mx-auto">
                  3
                </div>
                <h3 className="text-lg font-semibold text-green-300">Receive</h3>
                <p className="text-green-300/70 text-sm">
                  Get your book delivered once we reach our goal. Quality printing and careful packaging guaranteed.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </CRTFrame>

      {/* FAQ Section */}
      <CRTFrame intensity="subtle">
        <Card>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 text-center">Frequently Asked Questions</h2>

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
            <Link href="/imprint" className="text-green-300/60 hover:text-green-400 transition-colors">
              Imprint
            </Link>
          </div>
          <p className="text-green-300/40 text-xs">© 2024 Support the Print Campaign. All rights reserved.</p>
        </div>
      </Card>
    </Container>
  )
}
