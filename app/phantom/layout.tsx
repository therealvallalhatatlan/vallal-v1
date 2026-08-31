import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPhantomAccessPin, isValidPhantomAccess, PHANTOM_ACCESS_COOKIE } from '@/lib/security/phantomAccess'

export const dynamic = 'force-dynamic'

export default async function PhantomLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const access = cookieStore.get(PHANTOM_ACCESS_COOKIE)?.value
  const pin = getPhantomAccessPin()

  if (!isValidPhantomAccess(access, pin)) {
    notFound()
  }

  return children
}
