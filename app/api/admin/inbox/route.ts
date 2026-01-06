import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const requester = await getUserFromToken(token)
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if (!isAdminEmail(requester.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const supabase = supabaseAdmin()
  const limit = Number(new URL(req.url).searchParams.get("limit") || "50")

  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, created_at, last_message_at, last_admin_read_at, last_user_read_at")
    .order("last_message_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)))

  if (error) {
    console.error("[admin inbox] list error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ conversations: data })
}
