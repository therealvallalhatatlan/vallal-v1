// app/checkout/page.tsx
"use client"

import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { useState, useEffect } from "react"

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const price = 15000 // HUF

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) {
        setIsLoading(false)
        setError(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isLoading])

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    // Fallback Payment Link (ha az API nem ad vissza session URL-t)
    const PAYMENT_LINK = "https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        console.warn("[checkout] API hiba, fallback Stripe Payment Link")
        window.location.href = PAYMENT_LINK
        return
      }

      const data = await res.json()
      const url = data?.url
      if (!url) {
        console.warn("[checkout] Nincs session URL, fallback Payment Link")
        window.location.href = PAYMENT_LINK
        return
      }

      window.location.href = url
    } catch (err) {
      console.error("Checkout error:", err)
      window.location.href = PAYMENT_LINK
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="py-12">
      <div className="mx-auto w-[620px]">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-green-400">Sorszám lefoglalása</h1>
          <p className="mt-2 text-sm text-green-300/70">
            „Nem könyvet veszel, hanem <span className="text-green-300">koordinátát</span>.”
          </p>
        </header>

        <Card className="p-0 overflow-hidden">
          {/* Fejléc csík */}
          <div className="border-b border-green-400/20 bg-black/40 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-green-300 font-semibold">Vállalhatatlan — limitált drop</div>
                <div className="text-xs text-green-300/60">Sorszámozott példány • Dead-drop átvétel</div>
              </div>
              <div className="text-2xl font-extrabold text-green-400">{formatCurrency(price)}</div>
            </div>
          </div>

          {/* Tétel rövid összefoglaló */}
          <div className="px-5 py-5">
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div className="text-sm leading-relaxed text-green-200/90">
                A fizetés után kapod a <span className="font-semibold">sorszámodat</span>. Amikor a drop él, e-mailben
                küldjük a <span className="font-semibold">koordinátát</span> és egy rövid leírást a helyszínről.
                Nem bolt. Élmény.
              </div>
              <div className="hidden sm:block self-start rounded-md border border-green-400/20 bg-black/30 px-3 py-2 text-xs text-green-300/80">
                <div className="font-mono">TLS 1.3 • AES-256</div>
                <div className="font-mono">Stripe Secure</div>
              </div>
            </div>

            {/* Biztonság, fizetési módok */}
            <div className="mt-4 text-[12px] text-green-300/70">
              Titkosított fizetés a Stripe rendszerében. Elfogadott: bankkártya, Apple Pay, Google Pay.
            </div>

            {/* Hibaüzenet (ha lenne) */}
            {error && (
              <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* CTA */}
            <div className="mt-6">
              <Button
                onClick={handlePayment}
                variant="outline"
                size="lg"
                className="w-full py-6 text-lg border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                disabled={isLoading}
              >
                {isLoading ? "Átirányítás a Stripe-ra…" : "Tovább a fizetéshez"}
              </Button>
              {isLoading && (
                <p className="mt-2 text-center text-[11px] text-green-300/60">Megszakítás: ESC</p>
              )}
            </div>

            {/* Garancia / mini-FAQ kivonat */}
            <div className="mt-5 space-y-2 rounded-md border border-green-400/20 bg-black/30 p-3 text-[12px] leading-relaxed text-green-300/80">
              <p>
                <span className="font-semibold text-green-300">Nem jön össze a minimum?</span> Teljes visszatérítés
                ugyanarra a fizetési módra.
              </p>
              <p>
                <span className="font-semibold text-green-300">Hol lesz elrejtve?</span> Mindig közterületen, biztonságos,
                könnyen megközelíthető helyen. Fotós jelzéseket is kapsz.
              </p>
              <p>
                <span className="font-semibold text-green-300">Klubkedvezmény?</span> Ha van kuponod, a Stripe-on adhatod meg.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer microcopy */}
        <p className="mt-4 text-center text-[12px] text-green-300/50">
          A fizetéssel elfogadod a kampány feltételeit. Kérdésed van?
          {" "}
          <a href="mailto:hello@vallalhatatlan.online" className="underline hover:text-green-300">
            hello@vallalhatatlan.online
          </a>
        </p>
      </div>
    </Container>
  )
}
