import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Imprint - Support the Print",
  description: "Legal information and imprint for Support the Print crowdfunding campaign",
}

export default function ImprintPage() {
  return (
    <Container className="py-12">
      <Card>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-green-400">Imprint</h1>

          <div className="space-y-4 text-green-300/80">
            <h2 className="text-xl font-semibold text-green-300">Publisher Information</h2>
            <div className="space-y-2">
              <p>
                <strong>Company:</strong> Vállalhatatlan
              </p>
              <p>
                <strong>Email:</strong> therealvallalhatatlan@gmail.com
              </p>
            </div>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Legal Representative</h2>
            <p>Jane Doe, Managing Director</p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Registration</h2>
            <div className="space-y-2">
              <p>
                <strong>Business Registration:</strong> BC123456789
              </p>
              <p>
                <strong>Tax ID:</strong> TAX987654321
              </p>
            </div>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Dispute Resolution</h2>
            <p>
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer
              arbitration board.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Liability Notice</h2>
            <p>
              Despite careful content control, we assume no liability for the content of external links. The operators
              of the linked pages are solely responsible for their content.
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
