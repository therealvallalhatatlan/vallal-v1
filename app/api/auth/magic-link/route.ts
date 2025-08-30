export const runtime = "nodejs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { signLoginToken } from "@/lib/auth"

const RESEND_API = "https://api.resend.com/emails"
const FROM = process.env.EMAIL_FROM
const RESEND_KEY = process.env.RESEND_API_KEY
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

// simple server-side HTML renderer for the sign-in email (no React, no react-dom/server)
function renderSignInEmailHtml(url: string) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sign in</title>
<style>
  /* minimal inline styles */
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#f7fafc; padding:24px; color:#0f172a; }
  .container { max-width:600px; margin:0 auto; background:#fff; padding:24px; border-radius:8px; box-shadow:0 2px 12px rgba(2,6,23,0.08); }
  a.button { display:inline-block; padding:12px 18px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px; }
  p { margin:0 0 16px 0; }
  .muted { color:#64748b; font-size:13px; }
</style>
</head>
<body>
  <div class="container">
    <h1>Sign in to Vállalhatatlan</h1>
    <p>Click the button below to sign in. This link will expire in 15 minutes.</p>
    <p><a class="button" href="${url}">Sign in</a></p>
    <p class="muted">Or copy and paste this link into your browser:<br/><a href="${url}">${url}</a></p>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
	try {
		const json = await req.json()
		const emailRaw = String(json?.email || "").trim()
		if (!emailRaw) return NextResponse.json({ error: "Email required" }, { status: 400 })
		const email = emailRaw.toLowerCase()

		// upsert user (use array form and onConflict; remove unsupported 'returning' option)
		const supabase = getSupabaseAdmin()
		const { data, error } = await supabase
			.from("users")
			.upsert([{ email }], { onConflict: "email" })
			.select()
			.maybeSingle()

		if (error) {
			console.error("[AUTH] Supabase upsert user failed:", error)
			return NextResponse.json({ error: "Upsert user failed" }, { status: 500 })
		}
		const user = data as any
		const userId = user?.id
		if (!userId) return NextResponse.json({ error: "User id missing" }, { status: 500 })

		// create login token
		const token = await signLoginToken({ userId })
		const callbackUrl = `${SITE.replace(/\/$/, "")}/api/auth/callback?token=${encodeURIComponent(token)}`

		// render email HTML without using React/react-dom/server
		const html = renderSignInEmailHtml(callbackUrl)
		const text = `Sign in: ${callbackUrl}\n\nThis link expires in 15 minutes.`

		// send via Resend
		if (!RESEND_KEY || !FROM) {
			console.warn("[AUTH] Resend not configured; magic link:", callbackUrl)
		} else {
			await fetch(RESEND_API, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${RESEND_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from: FROM,
					to: [email],
					subject: "Sign in to Vállalhatatlan",
					html,
					text,
				}),
			})
		}

		return NextResponse.json({ ok: true })
	} catch (err) {
		console.error("[AUTH] magic-link error:", err)
		return NextResponse.json({ error: "Internal" }, { status: 500 })
	}
}
