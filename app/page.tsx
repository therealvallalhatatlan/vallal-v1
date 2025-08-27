import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GlitchText } from "@/components/GlitchText"
import { CRTFrame } from "@/components/CRTFrame"
import Link from "next/link"
import type { Metadata } from "next"
import { mockData, faqData } from "@/lib/mocks"
import { formatCurrency, formatSequence } from "@/lib/format"

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

export default function HomePage() {
  return (
    <Container className="py-12 space-y-12">
      {/* Hero Section */}
      <CRTFrame intensity="subtle">
        <Card className="relative overflow-hidden">
          {/* Main heading with glitch effect */}
          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-green-400">
                <GlitchText intensity="subtle">Support the Print</GlitchText>
              </h1>
            </div>

            {/* Description text */}
            <div className="space-y-4 text-center">
              <p className="text-green-300/80 text-lg leading-relaxed">
                We're creating something extraordinary – a carefully crafted book that deserves to exist in the world.
                This isn't just another publication; it's a passion project that brings together compelling stories,
                beautiful design, and meaningful content.
              </p>
              <p className="text-green-300/80 leading-relaxed">
                By supporting our crowdfunding campaign, you're not just pre-ordering a book – you're becoming part of a
                community that believes in independent publishing and quality craftsmanship.
              </p>
            </div>

            {/* Campaign Progress */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-green-400 text-center">
                <GlitchText intensity="subtle">Campaign Progress</GlitchText>
              </h2>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{mockData.totalPreorders}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Preorders</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">{mockData.totalGoal}</div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Goal</div>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400">
                    {formatSequence(mockData.nextSequence)}
                  </div>
                  <div className="text-green-300/60 text-xs lg:text-sm">Your Number</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-green-300/80">
                  <span>{mockData.progressPercent}% funded</span>
                  <span>{mockData.totalGoal - mockData.totalPreorders} remaining</span>
                </div>
                <div className="w-full bg-green-900/30 rounded-full h-3">
                  <div
                    className="bg-green-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${mockData.progressPercent}%` }}
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
              >
                <Link href="/checkout">Support the print – {formatCurrency(15000)}</Link>
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
