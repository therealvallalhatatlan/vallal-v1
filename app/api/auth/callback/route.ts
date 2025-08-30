export const runtime = "nodejs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyLoginToken, signSessionToken, createSessionCookie } from "@/lib/auth"

export async function GET(req: NextRequest) {
	try {
		const token = req.nextUrl.searchParams.get("token")
		const returnTo = req.nextUrl.searchParams.get("returnTo") || "/dashboard"
		if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })

		const { userId } = await verifyLoginToken(token)
		if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 400 })

		// sign session token and set cookie
		const sessionToken = await signSessionToken({ userId })
		const cookie = createSessionCookie({ token: sessionToken })

		// ensure returnTo is same origin
		const origin = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
		let redirectTo = returnTo
		try {
			const url = new URL(returnTo, origin)
			if (url.origin !== new URL(origin).origin) redirectTo = "/dashboard"
		} catch {
			redirectTo = "/dashboard"
		}

		const res = NextResponse.redirect(redirectTo)
		res.headers.set("Set-Cookie", cookie.headerValue)
		return res
	} catch (err) {
		console.error("[AUTH] callback error:", err)
		return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
	}
}
