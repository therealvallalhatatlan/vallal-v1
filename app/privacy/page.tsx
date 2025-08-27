import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Support the Print",
  description: "Privacy Policy for Support the Print crowdfunding campaign",
}

export default function PrivacyPage() {
  return (
    <Container className="py-12">
      <Card>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-green-400">Privacy Policy</h1>

          <div className="space-y-4 text-green-300/80">
            <p>
              We respect your privacy and are committed to protecting your personal information. This policy explains
              how we collect, use, and safeguard your data.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Information We Collect</h2>
            <p>
              We collect information you provide when contributing to our campaign, including your name, email address,
              and shipping information for order fulfillment.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">How We Use Your Information</h2>
            <p>
              Your information is used solely for campaign management, order processing, and communication about your
              contribution and delivery status.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Third-Party Services</h2>
            <p>
              We use trusted third-party services for payment processing and shipping. These services have their own
              privacy policies and security measures.
            </p>

            <h2 className="text-xl font-semibold text-green-300 mt-6">Contact Us</h2>
            <p>
              If you have questions about this privacy policy or your personal data, please contact us through our
              campaign page.
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
