import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const BUCKET = "distribution-drop-photos"
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_PHOTOS_PER_DROP = 8
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function extensionFor(type: string) {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  return "jpg"
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await context.params
  const form = await request.formData()
  const files = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0)
  if (!files.length) return NextResponse.json({ error: "photos_required" }, { status: 400 })
  if (files.length > MAX_PHOTOS_PER_DROP) return NextResponse.json({ error: "too_many_photos" }, { status: 400 })

  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "photo_too_large" }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "photo_type_not_allowed" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: drop, error: lookupError } = await db
    .from("distribution_drops")
    .select("id, cell_id, status, order_id, photo_paths")
    .eq("id", id)
    .maybeSingle()

  if (lookupError) {
    console.error("[distribution/cell/drops/photos] drop lookup error", lookupError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })

  const { data: membership, error: membershipError } = await db
    .from("distribution_cell_members")
    .select("cell_id")
    .eq("cell_id", drop.cell_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    console.error("[distribution/cell/drops/photos] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!membership) return NextResponse.json({ error: "not_cell_member" }, { status: 403 })
  if (!["active", "inactive"].includes(drop.status) || drop.order_id) return NextResponse.json({ error: "drop_not_editable" }, { status: 409 })

  const existingPaths: string[] = Array.isArray(drop.photo_paths) ? drop.photo_paths : []
  if (existingPaths.length + files.length > MAX_PHOTOS_PER_DROP) {
    return NextResponse.json({ error: "photo_limit_reached", max_photos: MAX_PHOTOS_PER_DROP }, { status: 400 })
  }

  const uploadedPaths: string[] = []
  for (const file of files) {
    const path = id + "/" + crypto.randomUUID() + "." + extensionFor(file.type)
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) {
      console.error("[distribution/cell/drops/photos] upload error", uploadError)
      if (uploadedPaths.length) await db.storage.from(BUCKET).remove(uploadedPaths)
      return NextResponse.json({ error: "photo_upload_failed" }, { status: 500 })
    }
    uploadedPaths.push(path)
  }

  const { data: updated, error: updateError } = await db
    .from("distribution_drops")
    .update({ photo_paths: [...existingPaths, ...uploadedPaths], updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("cell_id", drop.cell_id)
    .eq("status", drop.status)
    .is("order_id", null)
    .select("id")
    .maybeSingle()

  if (updateError || !updated) {
    await db.storage.from(BUCKET).remove(uploadedPaths)
    console.error("[distribution/cell/drops/photos] path save failed", updateError)
    return NextResponse.json({ error: "photo_save_failed" }, { status: 409 })
  }

  return NextResponse.json({ ok: true, uploaded: uploadedPaths.length }, { status: 201 })
}
