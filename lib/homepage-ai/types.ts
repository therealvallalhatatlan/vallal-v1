import type { Product } from "@/lib/shop/products"

export type HomepageSource =
  | "facebook"
  | "instagram"
  | "reddit"
  | "substack"
  | "google"
  | "qr"
  | "direct"
  | "unknown"

export type HomepageMood =
  | "morning"
  | "day"
  | "evening"
  | "late_night"
  | "returning"
  | "quiet"

export type HomepageOrderStatus =
  | "pending"
  | "paid"
  | "ready_to_dispatch"
  | "dispatched"
  | "fulfilled"
  | "received"
  | "cancelled"

export type HomepageProductCandidate = Pick<
  Product,
  "id" | "type" | "name" | "description" | "images" | "price"
>

export type HomepageStoryCandidate = {
  slug: string
  title: string
  excerpt: string
}

export type HomepageOrderContext = {
  id: string
  label: string
  status: HomepageOrderStatus
  createdAt: string
  userReceivedAt: string | null
  deliveryType: string | null
}

export type HomepageContext = {
  identity: {
    firstName: string
    memberSince: string | null
  }
  visit: {
    hour: number
    source: HomepageSource
    campaign: string | null
    path: string
    referrerHost: string | null
    isMobile: boolean
    isInAppBrowser: boolean
    visitsLast30Days: number
    lastVisitAt: string | null
    daysSinceLastVisit: number | null
  }
  relationship: {
    daysSinceProjectActivity: number | null
    engagementLevel: "new" | "casual" | "returning" | "core"
  }
  ownership: {
    book1: boolean
    book2: boolean
    merch: boolean
    mecenas: boolean
    founder: boolean
  }
  network: {
    acceptedClaims: number
    activeSpots: number
  }
  orders: HomepageOrderContext[]
  products: HomepageProductCandidate[]
  stories: HomepageStoryCandidate[]
  previousHomepage: {
    hook: string | null
    productId: string | null
    storySlug: string | null
    sessionId: string | null
    generatedAt: string | null
  }
}

export type HomepageBlock =
  | {
      type: "product"
      productId: string
      headline: string
      body: string
      cta: string
    }
  | {
      type: "story"
      storySlug: string
      headline: string
      cta: string
    }
  | {
      type: "order_status"
      orderId: string
      headline: string
      body: string
      cta: string | null
    }
  | {
      type: "network"
      headline: string
      body: string
      cta: string
    }
  | {
      type: "badges"
    }

export type HomepagePlan = {
  greeting: string
  mood: HomepageMood
  blocks: HomepageBlock[]
}
