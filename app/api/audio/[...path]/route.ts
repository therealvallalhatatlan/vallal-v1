import { NextRequest } from 'next/server'
import { fetchPrivateFileStream } from '@/lib/b2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const fileName = (path || []).map((seg) => decodeURIComponent(seg)).join('/')

  const range = req.headers.get('range') || undefined
  const url = new URL(req.url)
  const forceDownload = url.searchParams.get('download') === '1'

  try {
    const b2Res = await fetchPrivateFileStream(fileName, range)

    const headers = new Headers()
    const passthrough = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
      'x-bz-content-sha1',
    ]
    for (const key of passthrough) {
      const v = b2Res.headers.get(key)
      if (v) headers.set(key, v)
    }

    headers.set('Cache-Control', 'no-store')

    if (forceDownload) {
      const baseName = fileName.split('/').pop() || 'audio.mp3'
      headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`)
    }

     headers.set('Cache-Control', 'no-store')

    if (forceDownload) {
      const baseName = fileName.split('/').pop() || 'audio.mp3'
      headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`)
    }

    // 🔧 Fallback Content-Type, ha a B2 generic CT-t adott
    const currentCT = headers.get('content-type')
    if (!currentCT || currentCT === 'application/octet-stream') {
      const ext = (fileName.split('.').pop() || '').toLowerCase()
      const map: Record<string, string> = {
        mp3: 'audio/mpeg', mpeg: 'audio/mpeg', mp2: 'audio/mpeg',
        m4a: 'audio/mp4', mp4: 'audio/mp4',
        wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', webm: 'audio/webm',
      }
      const guess = map[ext]
      if (guess) headers.set('content-type', guess)
    }

    return new Response(b2Res.body, { status: b2Res.status, headers })

    return new Response(b2Res.body, { status: b2Res.status, headers })
  } catch (err: any) {
    return new Response(`Audio fetch error: ${err?.message || 'unknown'}`, { status: 502 })
  }
}
