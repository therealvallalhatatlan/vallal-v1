import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken, isAdminEmail } from "@/lib/auth"
import { guardWriteOperation } from "@/lib/systemGuard"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const supabase = supabaseAdmin()

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, user_id, created_at, last_message_at, last_admin_read_at, last_user_read_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[inbox] conversation fetch error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ conversation, isAdmin: isAdminEmail(user.email) })
}

export async function POST(req: NextRequest) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req);
  if (guardResponse) return guardResponse;
  
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const supabase = supabaseAdmin()

  const { data: existing, error: existingErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingErr) {
    console.error("[inbox] conversation lookup error", existingErr)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  if (existing?.id) {
    return NextResponse.json({ conversationId: existing.id })
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id })
    .select("id")
    .maybeSingle()

  if (error || !data?.id) {
    console.error("[inbox] conversation insert error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ conversationId: data.id })
}
