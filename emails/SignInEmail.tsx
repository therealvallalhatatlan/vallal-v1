import React from "react"

export default function SignInEmail({ url }: { url: string }) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", color: "#0f172a" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
          <h1 style={{ color: "#10b981", marginBottom: 8 }}>Sign in to Vállalhatatlan</h1>
          <p style={{ color: "#334155" }}>Click the button below to sign in. The link expires in 15 minutes.</p>
          <p style={{ marginTop: 20 }}>
            <a
              href={url}
              style={{
                background: "#10b981",
                color: "#000",
                padding: "12px 18px",
                borderRadius: 8,
                textDecoration: "none",
                display: "inline-block",
                fontWeight: 600,
              }}
            >
              Open sign-in link
            </a>
          </p>
          <p style={{ marginTop: 18, color: "#64748b", fontSize: 13 }}>
            If the button does not work, copy and paste this URL into your browser:
            <br />
            <a href={url} style={{ color: "#0ea5a3", wordBreak: "break-all" }}>{url}</a>
          </p>
          <p style={{ marginTop: 18, color: "#94a3b8", fontSize: 12 }}>
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  )
}
