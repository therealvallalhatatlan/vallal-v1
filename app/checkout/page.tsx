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

  // árak — állítsd, ha kell
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
      <div className="mx-auto w-[min(680px,100vw-32px)] px-4 space-y-12">

        {/* FEJLÉC */}
        <header className="mb-6 text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 px-3 py-1 text-[11px] text-lime-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            Finanszírozva • Kinyomtatva
          </div>
          <h1 className="text-3xl font-black tracking-tight text-green-400">
            Lépj be a történetbe
          </h1>
          <p className="mt-1 text-sm text-green-300/70">
            Nem csak könyvet kapsz, hanem egy városi küldetést és a teljes digitális ökoszisztémát.
          </p>
        </header>

        {/* DOBOZ */}
        <Card className="p-0 overflow-hidden">

          {/* fejléc sáv */}
          <div className="border-b border-green-400/20 bg-black/40 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-green-300 font-semibold">
                  Vállalhatatlan — limitált kiadás
                </div>
                <div className="text-xs text-green-300/60">
                  Sorszámozott példány • Dead-drop élmény + digitális hozzáférés
                </div>
              </div>
              <div className="text-2xl font-extrabold text-green-400">
                {formatCurrency(price)}
              </div>
            </div>
          </div>

          {/* tartalom */}
          <div className="px-5 py-5 space-y-6">

            {/* ajánlat röviden */}
            <div className="text-sm leading-relaxed text-green-200/90">
              A fizetés a <span className="font-semibold">belépőd</span> a Vállalhatatlan világába.
              A kötet elkészült, és <span className="font-semibold">azonnal megkaphatod.</span>.
              Amikor az átadás indul, kapsz egy részletes útmutatót: hol és hogyan veszed fel
              a példányod (dead-drop), plusz megnyílik a digitális felület a teljes anyaghoz.
            </div>

            {/* mi van benne */}
            <div className="grid gap-3 rounded-md border border-green-400/20 bg-black/30 p-3">
              <Row title="Fizikai könyv (limitált, sorszámozott)">
                Dedikált példány a 100-ból, minőségi nyomat, gyűjtői kiadás.
              </Row>
              <Row title="Digitális ökoszisztéma hozzáférés">
                Web/PDF/EPUB változat, fejezetenként QR-os extrák, naplózott térképes sztorielemek.
              </Row>
              <Row title="Soundtrack és letölthető zenék">
                Válogatott MP3/FLAC trackek, folyamatosan bővülő playlist.
              </Row>
              <Row title="Drop-útmutató és értesítések">
                E-mailben kapod a lépéseket, fotós nyomokat és a megjelenés/átvétel időpontját.
              </Row>
            </div>

            {/* biztonság */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-green-300/70">
              <div>Titkosított fizetés Stripe-on • Bankkártya, Apple Pay, Google Pay</div>
              <div className="hidden sm:block font-mono">TLS 1.3 • AES-256 • Stripe Secure</div>
            </div>

            {/* hiba */}
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* CTA */}
            <div>
              <Button
                onClick={handlePayment}
                variant="outline"
                size="lg"
                className="w-full py-6 text-lg bg-green-400/20 border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                disabled={isLoading}
                data-umami-event="checkout_pay_click"
              >
                {isLoading ? "Átirányítás a Stripe-ra…" : "Belépek a kalandba"}
              </Button>
              {isLoading && (
                <p className="mt-2 text-center text-[11px] text-green-300/60">
                  Megszakítás: ESC
                </p>
              )}
            </div>

            {/* mini-FAQ kivonat */}
            <div className="space-y-2 rounded-md border border-green-400/20 bg-black/30 p-3 text-[12px] leading-relaxed text-green-300/80">
              <p>
                <span className="font-semibold text-green-300">Nem tudok kimenni a dropra.</span>{" "}
                Kérésre <span className="font-semibold">postán is elküldjük bárhová a világon</span>
                . A szállítás külön díj, részleteket e-mailben egyeztetünk.
              </p>
              <p>
                <span className="font-semibold text-green-300">Mi van, ha csúszik a gyártás?</span>{" "}
                Minden frissítést kiküldünk e-mailben. Ha elmaradna a projekt, <b>teljes
                visszatérítést</b> adunk ugyanarra a fizetési módra.
              </p>
              <p>
                <span className="font-semibold text-green-300">Kupon / klubkedvezmény:</span>{" "}
                a Stripe fizetési felületén tudod megadni.
              </p>
            </div>
          </div>
        </Card>

        {/* lábléc-microcopy */}
        <p className="mt-2 text-center text-[12px] text-green-300/50">
          A fizetéssel elfogadod a feltételeket. Kérdésed van?{" "}
          <a href="mailto:hello@vallalhatatlan.online" className="underline hover:text-green-300">
            hello@vallalhatatlan.online
          </a>
        </p>
      </div>
    </Container>
  )
}

/* ---------------- small UI row ---------------- */
function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-green-300 font-semibold text-[13px]">{title}</div>
      <div className="text-green-300/80 text-[13px]">{children}</div>
    </div>
  )
}
