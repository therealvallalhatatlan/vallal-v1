import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sha256 } from "@/lib/hash";

const ACCESS_DURATION_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid slug" },
        { status: 400 }
      );
    }

    // Extract IP address
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    if (ip === "unknown") {
      return NextResponse.json(
        { error: "Could not determine IP address" },
        { status: 400 }
      );
    }

    // Hash the IP for privacy
    const ipHash = sha256(ip);
    const userAgent = req.headers.get("user-agent") || "unknown";

    const supabase = supabaseAdmin();

    // Check if access record exists
    const { data: existingAccess, error: fetchError } = await supabase
      .from("public_story_access")
      .select("*")
      .eq("ip_hash", ipHash)
      .eq("story_slug", slug)
      .single();

    const now = new Date();

    if (existingAccess && !fetchError) {
      const expiresAt = new Date(existingAccess.expires_at);

      // Check if access is still valid
      if (now < expiresAt) {
        // Update page views
        await supabase
          .from("public_story_access")
          .update({ page_views: existingAccess.page_views + 1 })
          .eq("id", existingAccess.id);

        const remainingMs = expiresAt.getTime() - now.getTime();
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return NextResponse.json({
          allowed: true,
          expiresAt: expiresAt.toISOString(),
          remainingSeconds,
          firstAccess: false,
        });
      } else {
        // Access expired, delete old record
        await supabase
          .from("public_story_access")
          .delete()
          .eq("id", existingAccess.id);

        return NextResponse.json({
          allowed: false,
          expired: true,
        });
      }
    }

    // No existing access, create new record
    const expiresAt = new Date(now.getTime() + ACCESS_DURATION_MINUTES * 60000);

    const { error: insertError } = await supabase
      .from("public_story_access")
      .insert({
        ip_hash: ipHash,
        story_slug: slug,
        first_access_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        page_views: 1,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error creating access record:", insertError);
      return NextResponse.json(
        { error: "Failed to create access record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      allowed: true,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: ACCESS_DURATION_MINUTES * 60,
      firstAccess: true,
    });
  } catch (error) {
    console.error("Story access error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
