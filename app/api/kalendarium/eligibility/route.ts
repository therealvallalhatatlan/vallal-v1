import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ eligible: false }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ eligible: false }, { status: 401 })
  }

  // The Kalendarium service directory is open to every authenticated
  // network member. Editorial approval and any paid placement are handled
  // separately; an admin/editor role is not required to submit.
  return NextResponse.json(
    { eligible: true },
    { headers: { "Cache-Control": "no-store" } },
  )
}
