import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

const MAX_BODY_CHARS = 2000

async function ensureConversationId(supabase: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data: convo, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (convo?.id) return convo.id

  const { data: inserted, error: insertErr } = await supabase
    .from("conversations")
    .insert({ user_id: userId })
    .select("id")
    .maybeSingle()

  if (insertErr) throw insertErr
  return inserted?.id || null
}

async function assertConversationOwner(
  supabase: ReturnType<typeof supabaseAdmin>,
  conversationId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("user_id")
    .eq("id", conversationId)
    .maybeSingle()
  if (error) throw error
  if (!data?.user_id || data.user_id !== userId) return false
  return true
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const supabase = supabaseAdmin()
  const url = new URL(req.url)
  const conversationId = url.searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "missing_conversation" }, { status: 400 })

  const isAdmin = isAdminEmail(user.email)
  if (!isAdmin) {
    const isOwner = await assertConversationOwner(supabase, conversationId, user.id)
    if (!isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 })
    await supabase
      .from("conversations")
      .update({ last_user_read_at: new Date().toISOString() })
      .eq("id", conversationId)
  } else {
    await supabase
      .from("conversations")
      .update({ last_admin_read_at: new Date().toISOString() })
      .eq("id", conversationId)
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_role, user_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[inbox] messages fetch error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}

export async function POST(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const supabase = supabaseAdmin()
  const isAdmin = isAdminEmail(user.email)

  const json = await req.json().catch(() => ({}))
  const rawBody = (json.body || "").toString()
  let conversationId = json.conversationId ? json.conversationId.toString() : ""

  const body = rawBody.trim().slice(0, MAX_BODY_CHARS)
  if (!body) return NextResponse.json({ error: "missing_body" }, { status: 400 })

  if (!isAdmin) {
    if (!conversationId) {
      conversationId = (await ensureConversationId(supabase, user.id)) || ""
    }
    const isOwner = await assertConversationOwner(supabase, conversationId, user.id)
    if (!isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  } else {
    if (!conversationId) return NextResponse.json({ error: "missing_conversation" }, { status: 400 })
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_role: isAdmin ? "admin" : "user",
    user_id: isAdmin ? null : user.id,
    body,
  })

  if (error) {
    console.error("[inbox] message insert error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, conversationId })
}
