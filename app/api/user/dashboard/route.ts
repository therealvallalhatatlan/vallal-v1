import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { parseBearerToken, getUserFromToken, getUserRoleByEmail } from '@/lib/auth'
import type { ClaimStatus, LocationSpotType, SpotStatus, VirtualSpotContentType } from '@/lib/matrica'
import type { DashboardApiResponse } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

type ClaimRow = {
  id: string
  status: ClaimStatus
  created_at: string
  sticker_spots?: {
    title: string | null
    type: LocationSpotType | null
    content_type: VirtualSpotContentType | null
  }
}

type SpotRow = {
  id: string
  title: string
  type: LocationSpotType | null
  status: SpotStatus
  created_at: string
}

const VALID_CLAIM_STATUSES: ClaimStatus[] = ['pending', 'accepted', 'rejected']
const VALID_LOCATION_TYPES: LocationSpotType[] = ['physical', 'virtual']
const VALID_VIRTUAL_CONTENT_TYPES: VirtualSpotContentType[] = ['video', 'audio', 'image', 'text', 'link', 'rich']
const VALID_SPOT_STATUSES: SpotStatus[] = ['active', 'empty', 'archived']

const isClaimStatus = (value: unknown): value is ClaimStatus =>
  typeof value === 'string' && VALID_CLAIM_STATUSES.includes(value as ClaimStatus)

const isLocationSpotType = (value: unknown): value is LocationSpotType =>
  typeof value === 'string' && VALID_LOCATION_TYPES.includes(value as LocationSpotType)

const isVirtualSpotContent = (value: unknown): value is VirtualSpotContentType =>
  typeof value === 'string' && VALID_VIRTUAL_CONTENT_TYPES.includes(value as VirtualSpotContentType)

const isSpotStatus = (value: unknown): value is SpotStatus =>
  typeof value === 'string' && VALID_SPOT_STATUSES.includes(value as SpotStatus)

function normalizeClaimRow(raw: unknown): ClaimRow | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : null
  const status = isClaimStatus(record.status) ? record.status : null
  const createdAt = typeof record.created_at === 'string' ? record.created_at : null
  if (!id || !status || !createdAt) return null

  let stickerSpots: ClaimRow['sticker_spots']
  const stickerRaw = record.sticker_spots
  if (stickerRaw && typeof stickerRaw === 'object') {
    const stickerRecord = stickerRaw as Record<string, unknown>
    const title = typeof stickerRecord.title === 'string' ? stickerRecord.title : null
    const type = isLocationSpotType(stickerRecord.type) ? stickerRecord.type : null
    const contentType = isVirtualSpotContent(stickerRecord.content_type)
      ? stickerRecord.content_type
      : null
    stickerSpots = { title, type, content_type: contentType }
  }

  return {
    id,
    status,
    created_at: createdAt,
    sticker_spots: stickerSpots,
  }
}

function normalizeSpotRow(raw: unknown): SpotRow | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : null
  const title = typeof record.title === 'string' ? record.title : null
  const status = isSpotStatus(record.status) ? record.status : null
  const createdAt = typeof record.created_at === 'string' ? record.created_at : null
  if (!id || !title || !status || !createdAt) return null

  const type = isLocationSpotType(record.type) ? record.type : null
  return {
    id,
    title,
    type,
    status,
    created_at: createdAt,
  }
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const db = supabaseAdmin()

  const [authUserRes, profileRes, claimsRes, spotsRes] = await Promise.all([
    db.auth.admin.getUserById(user.id),
    db.from('users').select('nickname, created_at').eq('id', user.id).maybeSingle(),
    db
      .from('claims')
      .select('id, status, created_at, sticker_spots (title, type, content_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    db
      .from('sticker_spots')
      .select('id, title, type, status, created_at')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (authUserRes.error || profileRes.error || claimsRes.error || spotsRes.error) {
    console.error('[user/dashboard] failed to compose response', {
      auth: authUserRes.error?.message,
      profile: profileRes.error?.message,
      claims: claimsRes.error?.message,
      spots: spotsRes.error?.message,
    })
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const authUser = authUserRes.data.user
  const nickname = profileRes.data?.nickname ?? null
  const createdAt = authUser?.created_at ?? profileRes.data?.created_at ?? null

  const rawClaims = claimsRes.data ?? []
  const rawSpots = spotsRes.data ?? []

  const claims: ClaimRow[] = rawClaims
    .map(normalizeClaimRow)
    .filter((claim): claim is ClaimRow => Boolean(claim))
  const spotsList: SpotRow[] = rawSpots
    .map(normalizeSpotRow)
    .filter((spot): spot is SpotRow => Boolean(spot))

  const totalClaims = claims.length
  const acceptedClaims = claims.filter((row) => row.status === 'accepted').length
  const pendingClaims = claims.filter((row) => row.status === 'pending').length
  const rejectedClaims = claims.filter((row) => row.status === 'rejected').length
  const physicalClaims = claims.filter((row) => row.sticker_spots?.type === 'physical').length
  const virtualClaims = claims.filter((row) => row.sticker_spots?.type === 'virtual').length

  const createdSpots = spotsList.length
  const activeCreatedSpots = spotsList.filter((spot) => spot.status === 'active').length
  const physicalCreatedSpots = spotsList.filter((spot) => spot.type === 'physical').length
  const virtualCreatedSpots = spotsList.filter((spot) => spot.type === 'virtual').length

  const recentClaims = claims.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    spot_title: row.sticker_spots?.title ?? 'ismeretlen pont',
    type: row.sticker_spots?.type ?? null,
    content_type: row.sticker_spots?.content_type ?? null,
  }))

  const recentSpots = spotsList.map((spot) => ({
    id: spot.id,
    title: spot.title,
    type: spot.type,
    status: spot.status,
    created_at: spot.created_at,
  }))

  const payload: DashboardApiResponse = {
    user: {
      id: authUser?.id ?? user.id,
      nickname,
      email: authUser?.email ?? user.email,
      avatar_url: authUser?.user_metadata?.avatar_url ?? null,
      role: getUserRoleByEmail(authUser?.email ?? user.email),
      created_at: createdAt,
      last_activity_at: claims[0]?.created_at ?? null,
    },
    stats: {
      totalClaims,
      acceptedClaims,
      pendingClaims,
      rejectedClaims,
      physicalClaims,
      virtualClaims,
      createdSpots,
      activeCreatedSpots,
      physicalCreatedSpots,
      virtualCreatedSpots,
    },
    recentClaims,
    recentSpots,
  }

  return NextResponse.json(payload)
}