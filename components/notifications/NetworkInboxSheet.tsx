"use client"

import { BellIcon } from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { setUnreadSource } from "@/lib/notifications/unreadStore"
import { useSessionGuard } from "@/hooks/useSessionGuard"

const AUTO_DISMISS_KEY = "network-inbox-dismissed"
const AUTO_OPEN_DELAY_MS = 4200
const NETWORK_ITEM_PREVIEW_LIMIT = 4
const UNREAD_SOURCE_KEY = "personal-notifications"
const badgeLimit = 99

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
}

type InboxNotification = {
  id: string
  type: "network" | "message"
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

type InboxPayload = {
  notifications: InboxNotification[]
  unreadNotificationCount: number
  messageOverview: MessageOverview | null
  networkActivity: {
    summary: Array<{ label: string; count: number }>
    items: NetworkActivityItem[]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isInboxPayload(value: unknown): value is InboxPayload {
  if (!isRecord(value)) return false

  return (
    Array.isArray(value.notifications) &&
    typeof value.unreadNotificationCount === "number" &&
    (value.messageOverview === null || isRecord(value.messageOverview)) &&
    isRecord(value.networkActivity) &&
    Array.isArray(value.networkActivity.summary) &&
    Array.isArray(value.networkActivity.items)
  )
}

function renderRelativeTime(dateString?: string | null) {
  if (!dateString) return ""

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""

  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export default function NetworkInboxSheet() {
  const { session, loading } = useSessionGuard()
  const token = session?.access_token

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  )

  const router = useRouter()

  const [payload, setPayload] = useState<InboxPayload | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const autoOpenTriggered = useRef(false)
  const autoOpenTimer = useRef<number | undefined>(undefined)

  const isAuthenticated = Boolean(session?.user)

  const fetchInbox = useCallback(async () => {
    if (!headers) return

    const controller = new AbortController()

    setFetchError(null)
    setIsFetching(true)

    try {
      const response = await fetch("/api/notifications", {
        headers,
        signal: controller.signal,
        cache: "no-store",
      })

      if (!response.ok) {
        setFetchError("fetch_failed")
        console.error("[network-inbox] fetch failed", response.status)
        return
      }

      const data: unknown = await response.json()

      if (!isInboxPayload(data)) {
        setFetchError("invalid_payload")
        console.error("[network-inbox] invalid API payload")
        return
      }

      setPayload(data)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }

      setFetchError("exception")
      console.error("[network-inbox] fetch exception", error)
    } finally {
      setIsFetching(false)
    }

    return () => controller.abort()
  }, [headers])

  useEffect(() => {
    if (!isAuthenticated || !headers) return

    let cancelled = false

    const load = async () => {
      if (cancelled) return
      await fetchInbox()
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, headers, fetchInbox])

  useEffect(() => {
    setUnreadSource(
      UNREAD_SOURCE_KEY,
      payload?.unreadNotificationCount ?? 0,
    )

    return () => {
      setUnreadSource(UNREAD_SOURCE_KEY, 0)
    }
  }, [payload])

  useEffect(() => {
    if (!isAuthenticated || !payload) return
    if (sheetOpen) return
    if (autoOpenTriggered.current) return
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(AUTO_DISMISS_KEY)) return

    const hasMeaningfulContent =
      payload.unreadNotificationCount > 0 ||
      Boolean(payload.messageOverview?.unread) ||
      payload.networkActivity.items.length > 0

    if (!hasMeaningfulContent) return

    autoOpenTimer.current = window.setTimeout(() => {
      setSheetOpen(true)
      autoOpenTriggered.current = true
    }, AUTO_OPEN_DELAY_MS)

    return () => {
      if (autoOpenTimer.current !== undefined) {
        window.clearTimeout(autoOpenTimer.current)
        autoOpenTimer.current = undefined
      }
    }
  }, [isAuthenticated, payload, sheetOpen])

  const handleOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)

    if (!open && typeof window !== "undefined") {
      window.sessionStorage.setItem(AUTO_DISMISS_KEY, "1")
    }
  }, [])

  const handleNotificationRead = useCallback(
    async (notificationId: string, targetUrl?: string) => {
      if (!headers || !payload) return

      const notification = payload.notifications.find(
        (item) => item.id === notificationId,
      )

      if (!notification) return

      if (!notification.read_at) {
        try {
          const response = await fetch(
            `/api/notifications/${notificationId}/read`,
            {
              method: "POST",
              headers,
            },
          )

          if (!response.ok) {
            console.error(
              "[network-inbox] mark read failed",
              response.status,
            )
            return
          }

          const readTimestamp = new Date().toISOString()

          setPayload((previous) => {
            if (!previous) return previous

            const updatedNotifications = previous.notifications.map(
              (item) =>
                item.id === notificationId
                  ? { ...item, read_at: readTimestamp }
                  : item,
            )

            const unreadCount = updatedNotifications.reduce(
              (count, item) => count + (item.read_at ? 0 : 1),
              0,
            )

            return {
              ...previous,
              notifications: updatedNotifications,
              unreadNotificationCount: unreadCount,
            }
          })
        } catch (error) {
          console.error(
            "[network-inbox] mark read exception",
            error,
          )
          return
        }
      }

      if (targetUrl) {
        setSheetOpen(false)
        router.push(targetUrl)
      }
    },
    [headers, payload, router],
  )

  const markAllRead = useCallback(async () => {
    if (!headers || !payload) return
    if (payload.unreadNotificationCount === 0) return

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers,
      })

      if (!response.ok) {
        console.error(
          "[network-inbox] mark all read failed",
          response.status,
        )
        return
      }
    } catch (error) {
      console.error(
        "[network-inbox] mark all read exception",
        error,
      )
      return
    }

    const now = new Date().toISOString()

    setPayload((previous) => {
      if (!previous) return previous

      return {
        ...previous,
        unreadNotificationCount: 0,
        notifications: previous.notifications.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? now,
        })),
      }
    })
  }, [headers, payload])

  if (loading || !isAuthenticated) {
    return null
  }

  const unreadCount = payload?.unreadNotificationCount ?? 0
  const networkSummary = payload?.networkActivity.summary ?? []
  const networkItems = payload?.networkActivity.items ?? []
  const messageOverview = payload?.messageOverview ?? null
  const notifications = payload?.notifications ?? []
  const totalNetworkSummary = networkSummary.reduce(
    (acc, entry) => acc + entry.count,
    0,
  )

  const networkItemsToDisplay = networkItems.slice(
    0,
    NETWORK_ITEM_PREVIEW_LIMIT,
  )

  return (
    <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-200 transition-all hover:border-lime-400/70 hover:bg-lime-400/10"
          aria-label="Open network inbox"
        >
          <BellIcon className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full bg-lime-400 px-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
              {unreadCount > badgeLimit
                ? `${badgeLimit}+`
                : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="z-[120] flex h-full w-[min(26rem,calc(100vw-1.5rem))] flex-col bg-[#030303] text-white"
        style={{
          paddingTop: "env(safe-area-inset-top,1rem)",
          paddingBottom: "env(safe-area-inset-bottom,1rem)",
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 pb-4 pt-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-lime-300">
              HÁLÓZAT
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[0.08em] text-white">
              Inbox
            </h2>
          </div>

          <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
            {totalNetworkSummary} új
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-zinc-500">
              <span>Az elmúlt 24 óra</span>
              <span>{networkItems.length} tétel</span>
            </div>

            <div className="space-y-2">
              <p className="text-3xl font-semibold tracking-[0.18em] text-white">
                {totalNetworkSummary} új szpot
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-zinc-400">
                {networkSummary.length > 0 ? (
                  networkSummary.map((entry) => (
                    <span
                      key={entry.label}
                      className="flex items-center gap-1"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                      {`${entry.count} ${entry.label.toUpperCase()}`}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-600">
                    Nincsenek összesített adatok.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {networkItemsToDisplay.length > 0 ? (
                networkItemsToDisplay.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      <span>
                        {item.category === "virtual"
                          ? "DIGITÁLIS"
                          : "FIZIKAI"}
                      </span>
                      <span>{renderRelativeTime(item.created_at)}</span>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {item.title ?? "Új szpot"}
                    </p>

                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-[12px] text-zinc-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  A hálózat nyugalomban van az elmúlt 24 órában.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-zinc-500">
              <span>Üzenetek</span>

              {messageOverview?.unread && (
                <span className="rounded-full border border-lime-200/60 bg-lime-400/80 px-2 py-1 text-[10px] font-semibold uppercase text-black">
                  új
                </span>
              )}
            </div>

            {messageOverview ? (
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false)
                  router.push("/inbox")
                }}
                className="w-full rounded border border-zinc-800 bg-zinc-900/70 px-3 py-4 text-left transition hover:border-lime-400/70"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                  <span>
                    {messageOverview.senderRole === "admin"
                      ? "Admin"
                      : "Te"}
                  </span>
                  <span>
                    {renderRelativeTime(messageOverview.timestamp)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold leading-tight text-white">
                  {messageOverview.preview ?? "Új üzenet"}
                </p>
              </button>
            ) : isFetching ? (
              <p className="text-sm text-zinc-500">
                Üzenetek betöltése…
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Nincs új üzenet.
              </p>
            )}
          </section>

          <section className="mt-6 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
              Értesítések
            </div>

            <div className="space-y-2">
              {fetchError && (
                <p className="text-sm text-amber-400">
                  Nem sikerült betölteni az értesítéseket.
                </p>
              )}

              {isFetching && !payload ? (
                <p className="text-sm text-zinc-500">
                  Értesítések betöltése…
                </p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nincsenek új értesítések.
                </p>
              ) : (
                notifications.map((notification) => {
                  const target = getTargetUrl(notification.data)
                  const isRead = Boolean(notification.read_at)

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        void handleNotificationRead(
                          notification.id,
                          target,
                        )
                      }
                      className={`w-full rounded border px-3 py-3 text-left transition ${
                        isRead
                          ? "border-zinc-800 bg-zinc-900/50"
                          : "border-lime-400/60 bg-lime-400/5"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        <span>
                          {notification.type === "network"
                            ? "HÁLÓZAT"
                            : "ÜZENET"}
                        </span>
                        <span>
                          {renderRelativeTime(notification.created_at)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {notification.title}
                      </p>

                      {notification.body && (
                        <p className="mt-1 text-xs leading-snug text-zinc-400">
                          {notification.body}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </section>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="text-lime-200 transition-colors hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={unreadCount === 0}
          >
            ÖSSZES MEGJELÖLÉSE OLVASOTTKÉNT
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function getTargetUrl(data: Record<string, unknown>) {
  const url = data?.url

  if (typeof url === "string" && url.trim()) {
    return url
  }

  return undefined
}