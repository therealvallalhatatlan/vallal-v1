"use client"

import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getPaymentMode, getPaymentLinkUrl } from "@/lib/config"

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const price = 15000 // 15,000 HUF

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isLoading) {
        setIsLoading(false)
        setError(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLoading])

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    // Fallback Payment Link provided by you
    const PAYMENT_LINK = "https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // send minimal body so endpoint accepts it
      })

      // If API call failed, redirect to payment link fallback
      if (!response.ok) {
        console.warn("[checkout] API create session failed, redirecting to payment link fallback")
        window.location.href = PAYMENT_LINK
        return
      }

      const data = await response.json()
      const url = data?.url

      // If API returned no url, use fallback link
      if (!url) {
        console.warn("[checkout] No session URL returned, using fallback payment link")
        window.location.href = PAYMENT_LINK
        return
      }

      // Redirect to Stripe Checkout session URL
      window.location.href = url
    } catch (err) {
      console.error("Checkout error:", err)
      // On unexpected errors, redirect to the payment link fallback so users can still pay
      window.location.href = PAYMENT_LINK
    } finally {
      // NOTE: navigation will usually occur before this runs, but keep state consistent
      setIsLoading(false)
    }
  }

  return (
    <Container className="py-12">
      <Card>
        <div className="space-y-6">
          {/*<div className="flex justify-center">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-400/30">
              Demo mode: real Stripe checkout, no DB yet
            </Badge>
          </div>*/}

          <h1 className="text-3xl font-bold text-green-400 text-center">Checkout</h1>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-300">Order Summary</h2>

            <div className="border border-green-400/20 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-green-300 font-medium">Support the Print</h3>
                  <p className="text-green-300/60 text-sm">Crowdfunding campaign contribution</p>
                </div>
                <span className="text-green-400 font-bold text-lg">{formatCurrency(price)}</span>
              </div>

              <div className="border-t border-green-400/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-300 font-semibold">Total</span>
                  <span className="text-green-400 font-bold text-xl">{formatCurrency(price)}</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handlePayment}
              variant="outline"
              size="lg"
              className="w-full text-lg py-6 bg-transparent"
              disabled={isLoading}
            >
              {isLoading ? "Redirecting to Stripe…" : "Proceed to payment"}
            </Button>
            {isLoading && <p className="text-green-300/60 text-xs text-center mt-2">Press ESC to cancel</p>}
          </div>

          <p className="text-green-300/60 text-sm text-center">
            By proceeding, you agree to support our crowdfunding campaign.
          </p>
        </div>
      </Card>
    </Container>
  )
}
