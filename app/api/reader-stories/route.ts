import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/server";
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

  // 3) Build stories payload
  const stories = [...storiesMeta]
    .sort((a, b) => a.order - b.order)
    .map((meta) => ({
      ...meta,
      text: meta.type === "cover" ? "" : loadStoryText(meta.slug),
    }));

  return NextResponse.json({ stories });
}
