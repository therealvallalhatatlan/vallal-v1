import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Support the Print",
  description: "Terms of Service for Support the Print crowdfunding campaign",
}

export default function TermsPage() {
  return (
    <Container className="py-12">
      <Card>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-green-400">Terms of Service</h1>

          <div className="space-y-4 text-green-300/80">
            <p>
              Welcome to Support the Print. By participating in our crowdfunding campaign, you agree to these terms and
              conditions.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Campaign Participation</h2>
            <p>
              Your contribution is a pre-order for the book described in our campaign. We will fulfill orders once our
              funding goal is reached.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Refunds and Cancellations</h2>
            <p>
              Refunds may be requested within 14 days of your contribution. If our campaign does not reach its funding
              goal, all contributions will be refunded.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Delivery</h2>
            <p>
              We estimate delivery within 3-6 months after successful campaign completion. Delivery times may vary based
              on production and shipping logistics.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Intellectual Property</h2>
            <p>
              All content, including text, images, and design elements, are protected by copyright and remain the
              property of Support the Print.
            </p>
          </div>

          <div className="pt-6 border-t border-green-400/20">
            <p className="text-green-300/60 text-sm">Updated: 2024-01-15</p>
          </div>

          <div className="pt-4">
            <Link href="/" className="text-green-400 hover:text-green-300 transition-colors">
              ← Back to Campaign
            </Link>
          </div>
        </div>
      </Card>
    </Container>
  )
}
