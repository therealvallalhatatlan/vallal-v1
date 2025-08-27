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

    try {
      const mode = getPaymentMode()
      const link = getPaymentLinkUrl()

      // If configured to use Stripe Payment Link, redirect there directly
      if (mode === "link" && link) {
        window.location.href = link
        return
      }

      // Fallback to API-based Checkout Session creation
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error("Checkout error:", error)
      setIsLoading(false)
      setError("Payment could not be initiated. Please try again.")
    }
  }

  return (
    <Container className="py-12">
      <Card>
        <div className="space-y-6">
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-400/30">
              Demo mode: real Stripe checkout, no DB yet
            </Badge>
          </div>

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
