import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storiesMeta } from "@/app/reader/storiesMeta";


function loadStoryText(slug: string): string {
  const filePath = path.join(process.cwd(), "content", "stories", `${slug}.txt`);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.error("Nem találom a story file-t:", filePath, e);
    return "[Hiányzó szöveg – ellenőrizd a .txt fájlokat]";
  }
}

export async function GET(req: NextRequest) {
  // Supabase session guard via bearer token
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const email = (data.user.email || "").toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "no_access" }, { status: 403 });
  }

  try {
    const admin = supabaseAdmin();
    const { data: allowedUser, error: allowedErr } = await admin
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (allowedErr) {
      console.error("[reader-stories] users entitlement query failed", allowedErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (!allowedUser) {
      return NextResponse.json({ error: "no_access" }, { status: 403 });
    }
  } catch (err) {
    console.error("[reader-stories] entitlement check crashed", err);
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // 3) Build stories payload
  const stories = [...storiesMeta]
    .sort((a, b) => a.order - b.order)
    .map((meta) => ({
      ...meta,
      text: meta.type === "cover" ? "" : loadStoryText(meta.slug),
    }));

  return NextResponse.json({ stories });
}
