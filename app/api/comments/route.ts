// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// környezeti változók (SERVICE ROLE itt kötelező, csak szerver oldalon)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// egyszerű rate-limit memória alap (serverless-ben rövidebb életű, lehet Redis)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 perc
const RATE_LIMIT_MAX = 6; // max 6 komment / perc per IP
const rateMap = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const story_slug = (json.story_slug || "").toString().trim();
    const author = (json.author || "Anonim").toString().trim().slice(0, 48);
    const body = (json.body || "").toString().trim().slice(0, 2000);
    if (!story_slug || !body) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // rate-limit IP alapján
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const arr = rateMap.get(ip) || [];
    // takarítás
    const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    rateMap.set(ip, recent);
    if (recent.length > RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // alapértelmezett publish: true (vagy false, ha moderálni szeretnéd)
    const { error } = await supabase.from("comments").insert([
      {
        story_slug,
        author,
        body,
        published: true,
        ip,
      },
    ]);

    if (error) {
      console.error("Supabase insert error", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // query: /api/comments?slug=xxx&limit=50
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const limit = Number(url.searchParams.get("limit") || "100");
  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .select("id,story_slug,author,body,created_at")
    .eq("story_slug", slug)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(Math.min(200, limit));

  if (error) {
    console.error("Supabase select error", error);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, comments: data });
}
