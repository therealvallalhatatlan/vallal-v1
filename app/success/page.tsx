import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatSequenceNumber } from "@/lib/format"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Payment Success | Next.js App",
  description: "Your payment was processed successfully",
  robots: "noindex",
}

export default function SuccessPage() {
  const orderNumber = 1234

  return (
    <Container className="py-12">
      <Card>
        <div className="text-center space-y-6">
          <div className="text-6xl text-green-400 mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-400">Payment Successful!</h1>
          <p className="text-green-300/80 text-lg">
            Thank you for your purchase. Your order {formatSequenceNumber(orderNumber)}
            has been confirmed and will be processed shortly.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-left space-y-4">
            <h2 className="text-xl font-semibold text-green-400">What happens next?</h2>
            <ul className="space-y-2 text-green-300/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>You'll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Track your order progress in your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>We'll notify you when production begins</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Your book will be shipped once the campaign goal is reached</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-green-300 text-sm">Order Number</p>
            <p className="text-green-400 font-bold text-xl">{formatSequenceNumber(orderNumber)}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button asChild variant="outline" className="bg-green-400 text-black hover:bg-green-300">
              <Link href="/dashboard">Go to my dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="text-green-400 hover:bg-green-400/10 bg-transparent">
              <Link href="/">Back to homepage</Link>
            </Button>
          </div>
        </div>
      </Card>
    </Container>
  )
}
