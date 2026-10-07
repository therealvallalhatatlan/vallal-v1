import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const BUCKET = "dead-drop-proofs"

function randomId() {
  return crypto.randomUUID()
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
  const message = String(form.get("message") || "").trim().slice(0, 1000)
  const photo = form.get("photo")
  const db = supabaseAdmin()

  let photoUrl: string | null = null

  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "photo_too_large" }, { status: 400 })

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"])
    if (!allowed.has(photo.type)) return NextResponse.json({ error: "photo_type_not_allowed" }, { status: 400 })

    const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg"
    const path = "distribution-drops/" + id + "/" + randomId() + "." + extension
    const buffer = Buffer.from(await photo.arrayBuffer())

    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: photo.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("[distribution/drops/collect] upload error", uploadError)
      return NextResponse.json({ error: "photo_upload_failed" }, { status: 500 })
    }

    photoUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  const { data: updated, error } = await db
    .from("distribution_drops")
    .update({
      status: "collected",
      found_at: new Date().toISOString(),
      found_by_user_id: user.id,
      found_message: message || null,
      found_photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "purchased")
    .eq("buyer_user_id", user.id)
    .select("id, order_id")
    .maybeSingle()

  if (error) {
    console.error("[distribution/drops/collect] update error", error)
    return NextResponse.json({ error: "collect_failed" }, { status: 500 })
  }

  if (!updated) return NextResponse.json({ error: "already_collected_or_not_authorized" }, { status: 409 })

  if (updated.order_id) {
    await db.from("orders")
      .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
      .eq("id", updated.order_id)
  }

  return NextResponse.json({ ok: true })
}
