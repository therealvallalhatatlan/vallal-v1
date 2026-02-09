// app/api/feed/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardWriteOperation } from "@/lib/systemGuard";

// Service role client for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple rate-limit (in-memory, per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 posts per minute per IP
const rateMap = new Map<string, number[]>();

// GET /api/feed - Fetch all feed posts
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "100");
    const before = url.searchParams.get("before"); // For pagination

    let query = supabase
      .from("feed_posts")
      .select("id, user_id, user_email, nickname, body, created_at, updated_at, is_edited")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, limit));

    // If 'before' timestamp provided, get posts older than that
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase select error", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, posts: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// POST /api/feed - Create new feed post
export async function POST(req: Request) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;
  
  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
    }

    // Rate limiting by IP
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] 
      || req.headers.get("x-real-ip") 
      || "unknown";
    const now = Date.now();
    const arr = rateMap.get(ip) || [];
    const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    rateMap.set(ip, recent);
    
    if (recent.length > RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // Parse body
    const json = await req.json();
    const body = (json.body || "").toString().trim();

    if (!body || body.length < 1 || body.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "invalid_body_length" }, 
        { status: 400 }
      );
    }

    // Fetch user's nickname from users table
    const { data: userData } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single();

    const nickname = userData?.nickname || null;

    // Insert post
    const { data, error } = await supabase
      .from("feed_posts")
      .insert([
        {
          user_id: user.id,
          user_email: user.email,
          nickname: nickname,
          body: body,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// PATCH /api/feed - Update existing post (within 5 minutes)
export async function PATCH(req: Request) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;
  
  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
    }

    // Parse body
    const json = await req.json();
    const postId = json.id;
    const newBody = (json.body || "").toString().trim();

    if (!postId || !newBody || newBody.length < 1 || newBody.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "invalid_parameters" }, 
        { status: 400 }
      );
    }

    // Update post (RLS policy enforces 5-minute window and user ownership)
    const { data, error } = await supabase
      .from("feed_posts")
      .update({ 
        body: newBody,
        updated_at: new Date().toISOString(),
        is_edited: true
      })
      .eq("id", postId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error", error);
      // Check if it's a policy violation (outside 5-minute window)
      if (error.code === "42501" || error.message.includes("policy")) {
        return NextResponse.json(
          { ok: false, error: "edit_window_expired" }, 
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "post_not_found_or_expired" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// DELETE /api/feed - Delete a post
export async function DELETE(req: Request) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;
  
  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
    }

    // Parse body
    const json = await req.json();
    const postId = json.id;

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "invalid_parameters" }, 
        { status: 400 }
      );
    }

    // Delete post (RLS policy enforces user ownership)
    const { error } = await supabase
      .from("feed_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Supabase delete error", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
