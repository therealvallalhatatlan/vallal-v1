import { NextRequest, NextResponse } from "next/server"
import { PostgrestError } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

const NETWORK_ACTIVITY_LIMIT = 15
const NETWORK_WINDOW_HOURS = 24

type NetworkActivityItem = {
  id: string
  title: string | null
  description: string | null
  category: "physical" | "virtual"
  spot_type: string | null
  content_type: string | null
  content_url: string | null
  image_url: string | null
  created_at: string
}

type MessageOverview = {
  conversationId: string
  preview: string | null
  senderRole: "user" | "admin"
  senderId: string | null
  timestamp: string | null
  unread: boolean
  unreadCount?: number
}

function logQueryResult(name: string, error: PostgrestError | null) {
  console.info(`[notifications] query ${name}`, {
    hasError: Boolean(error),
    message: error?.message ?? null,
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  })
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const now = new Date()
  const networkSince = new Date(now.getTime() - NETWORK_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const [notificationsRes, conversationRes, networkRes, pmUnreadRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, data, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("conversations")
      .select("id, last_message_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("sticker_spots")
      .select(
        "id, title, description, image_url, spot_type, type, content_type, content_url, created_at",
      )
      .eq("status", "active")
      .gte("created_at", networkSince)
      .order("created_at", { ascending: false })
      .limit(NETWORK_ACTIVITY_LIMIT),
    supabase
      .from("pm_unread_counts")
      .select("other_user_id, unread_count, last_message_at")
      .eq("user_id", user.id)
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false }),
  ])

  logQueryResult("notifications", notificationsRes.error)
  logQueryResult("conversations", conversationRes.error)
  logQueryResult("network_activity", networkRes.error)
  logQueryResult("pm_unread_counts", pmUnreadRes.error)

  if (notificationsRes.error) {
    console.error("[notifications] fetch error", notificationsRes.error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  if (networkRes.error) {
    console.error("[notifications] network activity fetch error", networkRes.error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const notifications = notificationsRes.data ?? []
  const unreadNotificationCount = notifications.reduce((acc, notification) => {
    return acc + (notification.read_at ? 0 : 1)
  }, 0)

  const networkItems: NetworkActivityItem[] = (networkRes.data ?? []).map((spot: any) => ({
    id: spot.id,
    title: typeof spot.title === "string" ? spot.title : null,
    description: typeof spot.description === "string" ? spot.description : null,
    category: spot.type === "virtual" ? "virtual" : "physical",
    spot_type: typeof spot.spot_type === "string" ? spot.spot_type : null,
    content_type: typeof spot.content_type === "string" ? spot.content_type : null,
    content_url: typeof spot.content_url === "string" ? spot.content_url : null,
    image_url: typeof spot.image_url === "string" ? spot.image_url : null,
    created_at: spot.created_at,
  }))

  const categoryCounts = networkItems.reduce(
    (result, item) => {
      result[item.category] += 1
      return result
    },
    { physical: 0, virtual: 0 },
  )

  const networkSummary = [] as Array<{ label: string; count: number }>
  if (categoryCounts.physical > 0) {
    networkSummary.push({ label: "Új fizikai pontok", count: categoryCounts.physical })
  }
  if (categoryCounts.virtual > 0) {
    networkSummary.push({ label: "Új digitális tartalmak", count: categoryCounts.virtual })
  }

  let messageOverview: MessageOverview | null = null
  if (conversationRes.error) {
    console.error("[notifications] conversation fetch error", conversationRes.error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const pmUnreadRows = pmUnreadRes.data ?? []
  const pmUnreadCount = pmUnreadRows.reduce((acc, row) => {
    const value = typeof row?.unread_count === "number" && Number.isFinite(row.unread_count) ? row.unread_count : 0
    return acc + Math.max(0, Math.floor(value))
  }, 0)

  if (conversationRes.data?.id) {
    const conversation = conversationRes.data
    const { data: lastMessage, error: lastMessageError } = await supabase
      .from("messages")
      .select("id, sender_role, user_id, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

  logQueryResult("messages.latest", lastMessageError)

    if (lastMessageError) {
      console.error("[notifications] last message fetch error", lastMessageError)
      return NextResponse.json({ error: "server_error" }, { status: 500 })
    }

    const hasUnread = pmUnreadCount > 0

    messageOverview = {
      conversationId: conversation.id,
      preview: typeof lastMessage?.body === "string" ? lastMessage.body.slice(0, 280) : null,
      senderRole: (lastMessage?.sender_role === "user" ? "user" : "admin"),
      senderId: typeof lastMessage?.user_id === "string" ? lastMessage.user_id : null,
      timestamp: lastMessage?.created_at ?? conversation.last_message_at ?? null,
      unread: hasUnread,
      unreadCount: pmUnreadCount,
    }
  }

  return NextResponse.json({
    notifications,
    unreadNotificationCount,
    messageOverview,
    networkActivity: {
      summary: networkSummary,
      items: networkItems,
    },
  })
}