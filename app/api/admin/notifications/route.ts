import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function expectedPinHash(): string | null {
  const pin = process.env.ADMIN_DASHBOARD_PIN;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback";
  if (!pin) return null;
  return createHash("sha256").update(pin + secret).digest("hex");
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAdminRequest(req: NextRequest): boolean {
  const cookieValue = req.cookies.get("x-admin-pin")?.value ?? "";
  const expected = expectedPinHash();
  return Boolean(expected && cookieValue && safeEquals(cookieValue, expected));
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("notification_broadcasts")
    .select("id, title, body, data, recipient_count, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[admin/notifications] history error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, broadcasts: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rate = checkRateLimit(
    "admin-system-notification:" + getClientIp(req),
    5,
    60_000,
  );

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let body: {
    title?: unknown;
    message?: unknown;
    public?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";
  const isPublic = body.public === true;

  if (!title) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc(
    "send_system_notification_broadcast",
    {
      p_title: title,
      p_body: message,
      p_data: {
        source: "admin",
        public: isPublic,
      },
      p_created_by: null,
    },
  );

  if (error) {
    console.error("[admin/notifications] broadcast error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    ok: true,
    broadcastId: result?.broadcast_id ?? null,
    recipientCount:
      typeof result?.recipient_count === "number"
        ? result.recipient_count
        : 0,
    public: isPublic,
  });
}
