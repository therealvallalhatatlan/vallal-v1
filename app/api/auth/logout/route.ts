export const runtime = "nodejs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function clearSessionCookieHeader() {
	const name = "session"
	// expire immediately
	const header = `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=${new Date(0).toUTCString()}`
	return header
}

export async function GET(req: NextRequest) {
	const res = NextResponse.redirect("/")
	res.headers.set("Set-Cookie", clearSessionCookieHeader())
	return res
}

export async function POST(req: NextRequest) {
	const res = NextResponse.json({}, { status: 204 })
	res.headers.set("Set-Cookie", clearSessionCookieHeader())
	return res
}
