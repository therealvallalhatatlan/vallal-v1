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

export interface DashboardApiResponse {
  user: DashboardUserInfo
  stats: DashboardStats
  recentClaims: DashboardClaimItem[]
  recentSpots: DashboardSpotItem[]
}