/**
 * Authentication utilities - Demo stubs
 * TODO: Replace with actual authentication provider (NextAuth, Supabase Auth, etc.)
 */

export interface User {
  id: string
  email: string
  name: string
}

export interface Session {
  user: User
  expires: string
}

/**
 * Demo hook that always returns null (no authentication)
 * TODO: Implement actual session management
 */
export function useSession(): { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" } {
  return {
    data: null,
    status: "unauthenticated",
  }
}

// Server-only auth helpers (JWT signing/verification & session cookie).
// Do not import in client components.
import { SignJWT, jwtVerify } from "jose"
import type { NextRequest } from "next/server"

const AUTH_SECRET = process.env.AUTH_SECRET
if (!AUTH_SECRET) throw new Error("AUTH_SECRET is required")

const encoder = new TextEncoder()
const secretKey = encoder.encode(AUTH_SECRET)

// sign a short-lived login token (for magic link)
export async function signLoginToken({ userId }: { userId: string }) {
	return await new SignJWT({ sub: userId })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secretKey)
}

// verify login token from magic link
export async function verifyLoginToken(token: string) {
	const { payload } = await jwtVerify(token, secretKey)
	const sub = typeof payload.sub === "string" ? payload.sub : null
	if (!sub) throw new Error("Invalid token payload")
	return { userId: sub }
}

// create session cookie token valid for 30 days
export async function signSessionToken({ userId }: { userId: string }) {
	return await new SignJWT({ sub: userId })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(30 * 24 * 60 * 60 + "s") // 30 days in seconds
		.sign(secretKey)
}

// cookie metadata for Set-Cookie header
export function createSessionCookie({ token }: { token: string }) {
	const name = "session"
	const maxAge = 30 * 24 * 60 * 60 // 30 days
	const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
	const options = `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`
	return { name, value: token, headerValue: `${name}=${token}; ${options}` }
}

// read session user from NextRequest (server-side)
export async function readSessionUser(request: NextRequest) {
	try {
		const cookie = request.cookies.get("session")?.value
		if (!cookie) return null
		const { payload } = await jwtVerify(cookie, secretKey)
		const userId = typeof payload.sub === "string" ? payload.sub : null
		if (!userId) return null
		return { userId }
	} catch {
		return null
	}
}

// verify session token (used by server components)
export async function verifySessionToken(token: string) {
	try {
		const { payload } = await jwtVerify(token, secretKey)
		const sub = typeof payload.sub === "string" ? payload.sub : null
		if (!sub) throw new Error("Invalid token payload")
		return { userId: sub }
	} catch (err) {
		throw new Error("Invalid or expired session token")
	}
}
