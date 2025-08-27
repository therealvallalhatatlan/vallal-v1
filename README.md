# Book Preorder App

A Next.js application for book preorders with Stripe integration.

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy environment variables:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

3. Update `.env.local` with your actual Stripe keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).

## Stripe Dev How-To

### Local Development Setup

1. **Install Stripe CLI**
   \`\`\`bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows/Linux - download from https://github.com/stripe/stripe-cli/releases
   \`\`\`

2. **Login to Stripe**
   \`\`\`bash
   stripe login
   \`\`\`

3. **Run local webhook forwarder**
   \`\`\`bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   \`\`\`

4. **Copy webhook secret**
   Copy the `whsec_***` secret from the CLI output into `.env.local`:
   \`\`\`
   STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
   \`\`\`

5. **Test webhook events**
   \`\`\`bash
   stripe trigger checkout.session.completed
   \`\`\`

### Production Deployment

1. **Set environment variables in Vercel**
   - `STRIPE_SECRET_KEY` (from Stripe Dashboard)
   - `STRIPE_WEBHOOK_SECRET` (create production webhook)
   - `NEXT_PUBLIC_SITE_URL` (your domain)

2. **Create production webhook**
   - Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Select events: `checkout.session.completed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Stripe Setup

### Development Webhook Testing

To test webhooks locally, use the Stripe CLI:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to your Stripe account:
\`\`\`bash
stripe login
\`\`\`

3. Forward webhooks to your local server:
\`\`\`bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
\`\`\`

4. Copy the webhook signing secret from the CLI output to your `.env.local` file as `STRIPE_WEBHOOK_SECRET`.

### Environment Variables

- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_test_` for test mode)
- `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret (starts with `whsec_`)
- `NEXT_PUBLIC_SITE_URL`: Your site URL for redirects
- `DEMO_ADMIN_KEY`: Admin panel access key

## Development

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.
