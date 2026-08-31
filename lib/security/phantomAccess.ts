import { createHash, timingSafeEqual } from 'crypto'

export const PHANTOM_ACCESS_COOKIE = 'x-phantom-access'

export function getPhantomAccessPin(): string | null {
  return process.env.PHANTOM_ACCESS_PIN?.trim() || process.env.ADMIN_DASHBOARD_PIN?.trim() || null
}

export function hashPhantomAccess(pin: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback'
  return createHash('sha256').update(`phantom:${pin}:${secret}`).digest('hex')
}

export function isValidPhantomAccess(value: string | undefined, pin: string | null): boolean {
  if (!value || !pin) return false
  const expected = hashPhantomAccess(pin)
  const actualBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}
