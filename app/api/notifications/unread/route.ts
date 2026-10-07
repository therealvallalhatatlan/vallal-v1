import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin().rpc(
    "get_notification_unread_snapshot",
    { p_user_id: user.id },
  )

  if (error) {
    console.error("[notifications/unread] snapshot failed", error)
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    )
  }

  const snapshot =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}

  return NextResponse.json(
    {
      ok: true,
      unreadNotificationCount:
        typeof snapshot.unreadNotificationCount === "number"
          ? Math.max(0, Math.floor(snapshot.unreadNotificationCount))
          : 0,
      latestNotification:
        snapshot.latestNotification &&
        typeof snapshot.latestNotification === "object" &&
        !Array.isArray(snapshot.latestNotification)
          ? snapshot.latestNotification
          : null,
      unreadByUserId:
        snapshot.unreadByUserId &&
        typeof snapshot.unreadByUserId === "object" &&
        !Array.isArray(snapshot.unreadByUserId)
          ? snapshot.unreadByUserId
          : {},
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}