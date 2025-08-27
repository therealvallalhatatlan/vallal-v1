import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Payment Cancelled | Next.js App",
  description: "Your payment was cancelled",
  robots: "noindex",
}

export default function CancelledPage() {
  return (
    <Container className="py-12">
      <Card>
        <div className="text-center space-y-6">
          <div className="text-6xl text-red-400 mb-4">✕</div>
          <h1 className="text-3xl font-bold text-red-400">Payment was cancelled.</h1>
          <p className="text-green-300/80 text-lg">
            Your payment was cancelled. No charges have been made to your account. You can try again or return to the
            homepage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button asChild variant="outline" className="bg-green-400 text-black hover:bg-green-300">
              <Link href="/checkout">Try checkout again</Link>
            </Button>
            <Button asChild variant="ghost" className="text-green-400 hover:bg-green-400/10">
              <Link href="/">Back to homepage</Link>
            </Button>
          </div>
        </div>
      </Card>
    </Container>
  )
}
