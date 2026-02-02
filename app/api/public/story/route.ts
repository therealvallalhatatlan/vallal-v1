import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sha256 } from "@/lib/hash";
import fs from "fs";
import path from "path";
import { humanize } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Extract and hash IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    if (ip === "unknown") {
      return NextResponse.json(
        { error: "Could not determine IP address" },
        { status: 400 }
      );
    }

    const ipHash = sha256(ip);
    const supabase = supabaseAdmin();

    // Verify access
    const { data: accessRecord, error: accessError } = await supabase
      .from("public_story_access")
      .select("*")
      .eq("ip_hash", ipHash)
      .eq("story_slug", slug)
      .single();

    if (accessError || !accessRecord) {
      return NextResponse.json(
        { error: "No access granted. Please request access first." },
        { status: 403 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(accessRecord.expires_at);

    if (now >= expiresAt) {
      return NextResponse.json(
        { error: "Access expired" },
        { status: 403 }
      );
    }

    // Load story content
    const filePath = path.join(process.cwd(), "content", "stories", `${slug}.txt`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    const text = fs.readFileSync(filePath, "utf8");

    // Get title using humanize function (same as /[slug]/ pages)
    const title = humanize(slug);

    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    return NextResponse.json({
      slug,
      title,
      text,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
    });
  } catch (error) {
    console.error("Story fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
