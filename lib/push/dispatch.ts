type DispatchPushInput = {
  userId: string
  title: string
  body: string
  url?: string
  unreadCount?: number
}

export async function dispatchPushNotification(input: DispatchPushInput): Promise<void> {
  const cronToken = process.env.CRON_SECRET_TOKEN
  if (!cronToken) return

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const payload = {
    userId: input.userId,
    title: input.title,
    body: input.body,
    url: input.url ?? '/v3',
    unreadCount: Number.isFinite(input.unreadCount)
      ? Math.max(0, Math.floor(input.unreadCount as number))
      : undefined,
  }

  const response = await fetch(`${siteUrl}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`push_send_failed:${response.status}:${text.slice(0, 160)}`)
  }
}
