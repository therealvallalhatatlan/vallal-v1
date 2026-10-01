"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, MessageCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import { createClient } from "@/lib/browser"
import { buildPrivateRoomId } from "@/lib/live/privateRooms"
import { setUnreadSource } from "@/lib/notifications/unreadStore"

type ToastItem = {
  id: string
  kind: "private" | "system"
  title: string
  body: string
  targetUrl?: string
}

type NotificationItem = {
  id: string
  type?: string
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

type PublicNotificationItem = {
  id: string
  title: string
  body: string | null
  created_at: string
}

const PUBLIC_UNREAD_SOURCE_KEY = "public-system"
const PUBLIC_SEEN_STORAGE_KEY = "vallalhatatlan:public-notifications-seen-v1"
const PUBLIC_POLL_INTERVAL_MS = 15_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getTargetUrl(data: Record<string, unknown>) {
  return typeof data.url === "string" && data.url.trim() ? data.url : undefined
}

function clip(value: string, max = 180) {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (normalized.length <= max) return normalized
  return normalized.slice(0, max - 1) + "…"
}

function readPublicSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set()

  try {
    const raw = window.localStorage.getItem(PUBLIC_SEEN_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string").slice(-200)
        : [],
    )
  } catch {
    return new Set()
  }
}

function writePublicSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return

  try {
    const values = Array.from(ids).slice(-200)
    window.localStorage.setItem(PUBLIC_SEEN_STORAGE_KEY, JSON.stringify(values))
  } catch {
    // Ignore localStorage failures.
  }
}

export default function GlobalNotificationToasts() {
  const { session, loading } = useSessionGuard()
  const token = session?.access_token ?? null
  const currentUserId = session?.user?.id ?? ""
  const router = useRouter()

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const notificationBaselineRef = useRef<Set<string> | null>(null)
  const pmBaselineRef = useRef<Record<string, number> | null>(null)
  const publicToastIdsRef = useRef<Set<string>>(new Set())
  const toastTimersRef = useRef<Record<string, number>>({})

  const markPublicNotificationSeen = useCallback((id: string) => {
    const seen = readPublicSeenIds()
    seen.add(id.replace(/^public-/, ""))
    writePublicSeenIds(seen)
  }, [])

  const dismissToast = useCallback((id: string) => {
    if (id.startsWith("public-")) {
      markPublicNotificationSeen(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))

    const timer = toastTimersRef.current[id]
    if (timer) {
      window.clearTimeout(timer)
      delete toastTimersRef.current[id]
    }
  }, [markPublicNotificationSeen])

  const pushToast = useCallback((toast: ToastItem) => {
    setToasts((current) => {
      const next = [toast, ...current.filter((item) => item.id !== toast.id)].slice(0, 3)
      return next
    })

    const timer = window.setTimeout(() => {
      dismissToast(toast.id)
    }, 6500)

    toastTimersRef.current[toast.id] = timer
  }, [dismissToast])

  const showPrivateMessageToast = useCallback(async (otherUserId: string) => {
    if (!token || !currentUserId || otherUserId === currentUserId) return

    const roomId = buildPrivateRoomId(currentUserId, otherUserId)

    try {
      const [profileResponse, messagesResponse] = await Promise.all([
        fetch("/api/user/profile?userId=" + encodeURIComponent(otherUserId), {
          cache: "no-store",
        }),
        fetch("/api/live-chat?room_id=" + encodeURIComponent(roomId) + "&limit=1", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        }),
      ])

      const profileJson: unknown = await profileResponse.json().catch(() => null)
      const messageJson: unknown = await messagesResponse.json().catch(() => null)

      const nickname =
        isRecord(profileJson) &&
        profileJson.ok &&
        isRecord(profileJson.profile) &&
        typeof profileJson.profile.nickname === "string" &&
        profileJson.profile.nickname.trim()
          ? profileJson.profile.nickname.trim()
          : "Új privát üzenet"

      const messages =
        isRecord(messageJson) && Array.isArray(messageJson.messages)
          ? messageJson.messages
          : []

      const latest = messages.length > 0 && isRecord(messages[messages.length - 1])
        ? messages[messages.length - 1]
        : null

      const body =
        latest && typeof latest.body === "string" && latest.body.trim()
          ? clip(latest.body)
          : "Új privát üzenet érkezett."

      pushToast({
        id: "pm-" + otherUserId + "-" + Date.now(),
        kind: "private",
        title: nickname,
        body,
        targetUrl: "/halozat?pm=" + encodeURIComponent(otherUserId),
      })
    } catch (error) {
      console.error("[global-notifications] PM toast failed", error)
      pushToast({
        id: "pm-" + otherUserId + "-" + Date.now(),
        kind: "private",
        title: "Új privát üzenet",
        body: "Új üzenet érkezett.",
        targetUrl: "/halozat?pm=" + encodeURIComponent(otherUserId),
      })
    }
  }, [currentUserId, pushToast, token])

  const pollPublicNotifications = useCallback(async () => {
    if (loading || token || currentUserId) {
      setUnreadSource(PUBLIC_UNREAD_SOURCE_KEY, 0)
      return
    }

    try {
      const response = await fetch("/api/notifications/public?limit=20", {
        cache: "no-store",
      })
      const data: unknown = await response.json().catch(() => null)

      if (
        !response.ok ||
        !isRecord(data) ||
        data.ok !== true ||
        !Array.isArray(data.notifications)
      ) {
        setUnreadSource(PUBLIC_UNREAD_SOURCE_KEY, 0)
        return
      }

      const notifications = data.notifications.filter(
        (item): item is PublicNotificationItem =>
          isRecord(item) &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.created_at === "string",
      )

      const seen = readPublicSeenIds()
      const unseen = notifications.filter((item) => !seen.has(item.id))
      setUnreadSource(PUBLIC_UNREAD_SOURCE_KEY, unseen.length)

      const newest = unseen[0]
      if (newest && !publicToastIdsRef.current.has(newest.id)) {
        publicToastIdsRef.current.add(newest.id)
        pushToast({
          id: "public-" + newest.id,
          kind: "system",
          title: newest.title,
          body: clip(newest.body || "Új rendszerüzenet érkezett."),
        })
      }
    } catch (error) {
      console.error("[global-notifications] public poll failed", error)
    }
  }, [currentUserId, loading, pushToast, token])

  const poll = useCallback(async () => {
    if (!token || !currentUserId || loading) return

    try {
      const [notificationsResponse, pmResponse] = await Promise.all([
        fetch("/api/notifications", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        }),
        fetch("/api/matrica/pm-unread", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        }),
      ])

      const notificationsJson: unknown = await notificationsResponse.json().catch(() => null)
      const pmJson: unknown = await pmResponse.json().catch(() => null)

      if (
        isRecord(notificationsJson) &&
        Array.isArray(notificationsJson.notifications)
      ) {
        const notifications = notificationsJson.notifications.filter(
          (item): item is NotificationItem =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.title === "string",
        )

        const currentIds = new Set(notifications.map((item) => item.id))

        if (notificationBaselineRef.current === null) {
          notificationBaselineRef.current = currentIds
        } else {
          const newUnread = notifications
            .filter(
              (item) =>
                !item.read_at &&
                !notificationBaselineRef.current?.has(item.id),
            )
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )

          const newest = newUnread[0]
          if (newest) {
            pushToast({
              id: "notification-" + newest.id,
              kind: "system",
              title: newest.title,
              body: clip(newest.body || "Új rendszerüzenet érkezett."),
              targetUrl: getTargetUrl(newest.data),
            })
          }

          notificationBaselineRef.current = currentIds
        }
      }

      if (isRecord(pmJson) && isRecord(pmJson.unreadByUserId)) {
        const next: Record<string, number> = {}

        for (const [userId, rawCount] of Object.entries(pmJson.unreadByUserId)) {
          const count =
            typeof rawCount === "number" && Number.isFinite(rawCount)
              ? Math.max(0, Math.floor(rawCount))
              : 0
          if (count > 0) next[userId] = count
        }

        if (pmBaselineRef.current === null) {
          pmBaselineRef.current = next
        } else {
          const previous = pmBaselineRef.current

          for (const [userId, count] of Object.entries(next)) {
            if ((previous[userId] ?? 0) < count) {
              await showPrivateMessageToast(userId)
              break
            }
          }

          pmBaselineRef.current = next
        }
      }
    } catch (error) {
      console.error("[global-notifications] poll failed", error)
    }
  }, [currentUserId, loading, pushToast, showPrivateMessageToast, token])


  useEffect(() => {
    if (loading || !token || !currentUserId) return

    const supabase = createClient()
    let debounceTimer: number | null = null

    const channel = supabase
      .channel("global:pm-unread:" + currentUserId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pm_unread_counts",
          filter: "user_id=eq." + currentUserId,
        },
        () => {
          if (debounceTimer) window.clearTimeout(debounceTimer)
          debounceTimer = window.setTimeout(() => {
            void poll()
          }, 450)
        },
      )
      .subscribe()

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      void channel.unsubscribe()
    }
  }, [currentUserId, loading, poll, token])
  useEffect(() => {
    if (loading) return

    if (token && currentUserId) {
      publicToastIdsRef.current.clear()
      setUnreadSource(PUBLIC_UNREAD_SOURCE_KEY, 0)
      return
    }

    void pollPublicNotifications()

    const intervalId = window.setInterval(() => {
      void pollPublicNotifications()
    }, PUBLIC_POLL_INTERVAL_MS)

    const handleFocus = () => {
      void pollPublicNotifications()
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      setUnreadSource(PUBLIC_UNREAD_SOURCE_KEY, 0)
    }
  }, [currentUserId, loading, pollPublicNotifications, token])

  useEffect(() => {
    if (loading || !token || !currentUserId) {
      setToasts([])
      notificationBaselineRef.current = null
      pmBaselineRef.current = null
      return
    }

    let cancelled = false

    const run = async () => {
      if (cancelled) return
      await poll()
    }

    void run()

    const intervalId = window.setInterval(() => {
      void run()
    }, 15_000)

    const handleFocus = () => {
      void run()
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)

      for (const timer of Object.values(toastTimersRef.current)) {
        window.clearTimeout(timer)
      }
      toastTimersRef.current = {}
    }
  }, [currentUserId, loading, poll, token])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[200] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:max-w-[28rem]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto relative w-full overflow-hidden border border-zinc-700 bg-zinc-950/95 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              dismissToast(toast.id)
              if (toast.targetUrl) router.push(toast.targetUrl)
            }}
            className="group block w-full p-4 pr-12 text-left transition-colors hover:bg-lime-400/[0.035]"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-lime-400/30 bg-lime-400/[0.04] text-lime-200">
                {toast.kind === "private" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className="block text-[9px] uppercase tracking-[0.24em] text-lime-300/70"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {toast.kind === "private" ? "ÚJ PRIVÁT ÜZENET" : "ÚJ RENDSZERÜZENET"}
                </span>

                <span className="mt-1 block truncate text-sm font-semibold text-zinc-100">
                  {toast.title}
                </span>

                <span
                  className="mt-1 block text-xs leading-5 text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {toast.body}
                </span>
              </span>
            </div>
          </button>

          <button
            type="button"
            aria-label="Értesítés bezárása"
            onClick={() => dismissToast(toast.id)}
            className="absolute right-3 top-3 p-1 text-zinc-700 transition-colors hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
