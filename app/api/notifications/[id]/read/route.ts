import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { guardWriteOperation } from "@/lib/systemGuard"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const paramsResolved = await params
  const notificationId = paramsResolved?.id?.trim()
  if (!notificationId) {
    return NextResponse.json({ error: "missing_notification_id" }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .limit(1)

  if (error) {
    console.error("[notifications] mark read error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}