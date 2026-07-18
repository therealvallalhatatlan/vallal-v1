import { NextRequest, NextResponse } from 'next/server'
import { guardWriteOperation } from '@/lib/systemGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10
const rateMap = new Map<string, number[]>()

function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase()
  const [localPart, domainPart = ''] = trimmed.split('@')

  if (!localPart || !domainPart) return trimmed

  return `${localPart.split('+')[0]}@${domainPart}`
}

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  try {
    const json = await req.json()
    const email = (json.email || '').toString().trim()
    const storySlug = (json.storySlug || '').toString().trim()

    if (!email || !storySlug) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!isValidEmail) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const now = Date.now()
    const recent = (rateMap.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
    recent.push(now)
    rateMap.set(ip, recent)

    if (recent.length > RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    const normalizedEmail = normalizeEmail(email)
    const userAgent = req.headers.get('user-agent') || null

    const { error } = await supabaseAdmin()
      .from('story_unlocks')
      .upsert(
        {
          story_slug: storySlug,
          email,
          normalized_email: normalizedEmail,
          ip,
          user_agent: userAgent,
        },
        {
          onConflict: 'normalized_email,story_slug',
          ignoreDuplicates: false,
        },
      )

    if (error) {
      console.error('Story unlock insert error', error)
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Story unlock request error', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}