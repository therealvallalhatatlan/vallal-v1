import { NextRequest, NextResponse } from "next/server";

import {
  buildDeadDropStoragePath,
  deadDropClaimSchema,
  DEAD_DROP_ALLOWED_MIME_TYPES,
  DEAD_DROP_BUCKET,
  DEAD_DROP_MAX_FILE_BYTES,
  DROP_SELECT_FIELDS,
  normalizeDeadDropRow,
} from "@/lib/deadDrops";
import { guardWriteOperation } from "@/lib/systemGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateMap = new Map<string, number[]>();

function getClientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function isAllowedMimeType(type: string): type is (typeof DEAD_DROP_ALLOWED_MIME_TYPES)[number] {
  return DEAD_DROP_ALLOWED_MIME_TYPES.includes(type as (typeof DEAD_DROP_ALLOWED_MIME_TYPES)[number]);
}

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req as never);
  if (guardResponse) return guardResponse;

  const ip = getClientIp(req);
  const now = Date.now();
  const attempts = (rateMap.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  rateMap.set(ip, attempts);

  if (attempts.length > RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  if ((formData.get("company") || "").toString().trim()) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const parsed = deadDropClaimSchema.safeParse({
    dropId: formData.get("dropId"),
    alias: formData.get("alias"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json({ ok: false, error: "invalid_image" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > DEAD_DROP_MAX_FILE_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const storagePath = buildDeadDropStoragePath(parsed.data.dropId, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage.from(DEAD_DROP_BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      console.error("[dead-drops/claim] upload error", uploadError);
      return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
    }

    const { data: publicUrlData } = db.storage.from(DEAD_DROP_BUCKET).getPublicUrl(storagePath);
    const claimedAt = new Date().toISOString();

    const { data: updatedDrop, error: updateError } = await db
      .from("drops")
      .update({
        status: "claimed",
        anonymous_finder_alias: parsed.data.alias,
        proof_note: parsed.data.note ?? null,
        proof_image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        claimed_at: claimedAt,
      })
      .eq("id", parsed.data.dropId)
      .eq("status", "active")
      .select(DROP_SELECT_FIELDS)
      .maybeSingle();

    if (updateError) {
      console.error("[dead-drops/claim] update error", updateError);
      return NextResponse.json({ ok: false, error: "claim_failed" }, { status: 500 });
    }

    if (!updatedDrop) {
      const { data: existingDrop } = await db
        .from("drops")
        .select("id, status")
        .eq("id", parsed.data.dropId)
        .maybeSingle();

      return NextResponse.json(
        { ok: false, error: existingDrop ? "already_claimed" : "drop_not_found" },
        { status: existingDrop ? 409 : 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      drop: normalizeDeadDropRow(updatedDrop as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[dead-drops/claim] server error", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}