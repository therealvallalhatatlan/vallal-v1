import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ eligible: false }, { status: 401 })
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ eligible: false }, { status: 401 })
  return NextResponse.json({ eligible: canCreatePaidSpots(getUserRoleByEmail(user.email)) })
}
