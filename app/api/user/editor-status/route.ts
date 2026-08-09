import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken, isEditorEmail, parseBearerToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  return NextResponse.json({ ok: true, isEditor: isEditorEmail(user.email) })
}
