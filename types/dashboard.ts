import type { ClaimStatus, LocationSpotType, SpotStatus, VirtualSpotContentType } from '@/lib/matrica'
import type { UserRole } from '@/lib/auth'

export interface DashboardUserInfo {
  id: string
  nickname: string | null
  email: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string | null
  last_activity_at: string | null
}

export interface DashboardStats {
  totalClaims: number
  acceptedClaims: number
  pendingClaims: number
  rejectedClaims: number
  physicalClaims: number
  virtualClaims: number
  createdSpots: number
  activeCreatedSpots: number
  physicalCreatedSpots: number
  virtualCreatedSpots: number
}

export interface DashboardClaimItem {
  id: string
  created_at: string
  status: ClaimStatus
  spot_title: string
  type: LocationSpotType | null
  content_type: VirtualSpotContentType | null
}

export interface DashboardSpotItem {
  id: string
  title: string
  type: LocationSpotType | null
  status: SpotStatus
  created_at: string
}

export interface DashboardUnifiedOrder {
  id: string
  source: "book" | "shop"
  created_at: string
  status: string
  amountHuf: number
  currency: string
  label: string
  productId: string | null
  deliveryType: string | null
  fulfilled_at: string | null
  dispatched_at: string | null
  user_received_at: string | null
  priority: boolean
  items: Array<{
    name: string
    code: string | null
    quantity: number
    lineTotalHuf: number
    variant: string | null
  }>
}

export interface DashboardAccountResponse {
  generated_at: string
  user: {
    id: string
    email: string | null
    nickname: string | null
    role: UserRole
    avatar_url: string | null
    created_at: string | null
    updated_at: string | null
    last_sign_in_at: string | null
  }
  circle: {
    code: "outside" | "a" | "inner" | "core"
    label: string
    spendHuf: number
  }
  badges: Array<{
    code: "first_book" | "second_book" | "mecenas" | "founder" | "merch"
    name: string
    description: string
    earnedAt: string | null
  }>
  spend: {
    totalHuf: number
    orderCount: number
  }
  orders: DashboardUnifiedOrder[]
  purchases: {
    numberedCopies: Array<{
      copyNumber: number
      status: string
      priceHuf: number
    }>
    itemCount: number
  }
  network: {
    claims: {
      total: number
      accepted: number
      pending: number
      rejected: number
      physical: number
      digital: number
    }
    spots: {
      total: number
      active: number
      physical: number
      digital: number
    }
  }
}

export interface DashboardApiResponse {
  user: DashboardUserInfo
  stats: DashboardStats
  recentClaims: DashboardClaimItem[]
  recentSpots: DashboardSpotItem[]
}