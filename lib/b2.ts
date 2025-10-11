// lib/b2.ts
import 'server-only'

let accountCache: {
  authorizationToken: string
  apiUrl: string
  downloadUrl: string
  expiresAt: number
} | null = null

const ACCOUNT_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

async function authorizeAccount() {
  if (
    accountCache &&
    Date.now() < accountCache.expiresAt &&
    accountCache.authorizationToken &&
    accountCache.apiUrl &&
    accountCache.downloadUrl
  ) {
    return accountCache
  }

  const keyId = process.env.B2_KEY_ID!
  const appKey = process.env.B2_APP_KEY!
  const basic = Buffer.from(`${keyId}:${appKey}`).toString('base64')

  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`B2 authorize failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as {
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
  }

  accountCache = {
    ...data,
    expiresAt: Date.now() + ACCOUNT_TTL_MS,
  }

  return accountCache
}

/** -------------------------------
 *  CACHED DOWNLOAD AUTHORIZATION
 *  ------------------------------- */
const dlAuthCache = new Map<string, { token: string; exp: number }>()
const DL_AUTH_TTL = 3600 // seconds (1h)

export async function getDownloadAuthorization(fileName: string, seconds = DL_AUTH_TTL) {
  const nowSec = Math.floor(Date.now() / 1000)
  const cached = dlAuthCache.get(fileName)
  if (cached && cached.exp - 30 > nowSec) {
    return cached.token
  }

  const { apiUrl, authorizationToken } = await authorizeAccount()
  const bucketId = process.env.B2_BUCKET_ID!

  const body = {
    bucketId,
    fileNamePrefix: fileName,
    validDurationInSeconds: seconds,
  }

  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      Authorization: authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`B2 get_download_authorization failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { authorizationToken: string }
  dlAuthCache.set(fileName, { token: data.authorizationToken, exp: nowSec + seconds })
  return data.authorizationToken
}

export async function fetchPrivateFileStream(fileName: string, rangeHeader?: string) {
  const { downloadUrl } = await authorizeAccount()
  const bucketName = process.env.B2_BUCKET_NAME!

  const encodedName = fileName.split('/').map(encodeURIComponent).join('/')
  const url = `${downloadUrl}/file/${encodeURIComponent(bucketName)}/${encodedName}`

  const downloadAuth = await getDownloadAuthorization(fileName, DL_AUTH_TTL)

  const headers: Record<string, string> = { Authorization: downloadAuth }
  if (rangeHeader) headers['Range'] = rangeHeader

  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
  if (!res.ok && res.status !== 206) {
    const text = await res.text().catch(() => '')
    const msg = `B2 download failed: status=${res.status} bucket=${bucketName} fileName=${fileName} url=${url} body=${text}`
    throw new Error(msg)
  }
  return res
}
