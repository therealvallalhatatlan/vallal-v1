import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const BUCKET = "distribution-drop-photos"
const ALLOWED_FULFILLMENT = new Set([
  "dead_drop",
  "personal",
  "hu_shipping",
  "eu_shipping",
  "global_shipping",
])

async function authorizeCellMember(request: NextRequest, cellId: string) {
  const token = parseBearerToken(request.headers)
  if (!token) return { ok: false as const, response: NextResponse.json({ error: "missing_token" }, { status: 401 }) }

  const user = await getUserFromToken(token)
  if (!user?.id) return { ok: false as const, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) }

  const db = supabaseAdmin()
  const { data: membership, error } = await db
    .from("distribution_cell_members")
    .select("cell_id")
    .eq("cell_id", cellId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[distribution/cell/drops/id] membership error", error)
    return { ok: false as const, response: NextResponse.json({ error: "server_error" }, { status: 500 }) }
  }
  if (!membership) return { ok: false as const, response: NextResponse.json({ error: "not_cell_member" }, { status: 403 }) }
  return { ok: true as const, user, db }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const db = supabaseAdmin()
  const { data: drop, error } = await db
    .from("distribution_drops")
    .select("id, cell_id, product_id, product_name, price_huf, city, district, location_hint, lat, lng, fulfillment_options, status, hidden_at, found_at, photo_paths, order_id")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[distribution/cell/drops/id] drop lookup error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })

  const auth = await authorizeCellMember(request, drop.cell_id)
  if (!auth.ok) return auth.response

  const paths: string[] = Array.isArray(drop.photo_paths) ? drop.photo_paths : []
  const photos = await Promise.all(paths.map(async (path) => {
    const { data, error: signError } = await auth.db.storage.from(BUCKET).createSignedUrl(path, 15 * 60)
    if (signError || !data?.signedUrl) {
      console.error("[distribution/cell/drops/id] photo signing failed", signError)
      return null
    }
    return { path, url: data.signedUrl }
  }))

  return NextResponse.json({
    ok: true,
    drop: {
      id: drop.id,
      product_id: drop.product_id,
      product_name: drop.product_name,
      price_huf: drop.price_huf,
      city: drop.city,
      district: drop.district,
      location_hint: drop.location_hint,
      lat: drop.lat,
      lng: drop.lng,
      fulfillment_options: drop.fulfillment_options,
      status: drop.status,
      hidden_at: drop.hidden_at,
      found_at: drop.found_at,
      order_id: drop.order_id,
      photos: photos.filter((photo): photo is { path: string; url: string } => Boolean(photo)),
    },
  })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const db = supabaseAdmin()
  const { data: drop, error: lookupError } = await db
    .from("distribution_drops")
    .select("id, cell_id, status, photo_paths, order_id")
    .eq("id", id)
    .maybeSingle()

  if (lookupError) {
    console.error("[distribution/cell/drops/id] edit lookup error", lookupError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })

  const auth = await authorizeCellMember(request, drop.cell_id)
  if (!auth.ok) return auth.response
  if (!["active", "inactive"].includes(drop.status) || drop.order_id) {
    return NextResponse.json({ error: "drop_not_editable" }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_json" }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ("district" in body) {
    if (body.district !== null && typeof body.district !== "string") return NextResponse.json({ error: "invalid_district" }, { status: 400 })
    update.district = typeof body.district === "string" ? body.district.trim().slice(0, 120) || null : null
  }
  if ("location_hint" in body) {
    if (typeof body.location_hint !== "string" || !body.location_hint.trim() || body.location_hint.trim().length > 1000) {
      return NextResponse.json({ error: "invalid_location_hint" }, { status: 400 })
    }
    update.location_hint = body.location_hint.trim()
  }
  if ("lat" in body) {
    const value = Number(body.lat)
    if (!Number.isFinite(value) || value < -90 || value > 90) return NextResponse.json({ error: "invalid_lat" }, { status: 400 })
    update.lat = value
  }
  if ("lng" in body) {
    const value = Number(body.lng)
    if (!Number.isFinite(value) || value < -180 || value > 180) return NextResponse.json({ error: "invalid_lng" }, { status: 400 })
    update.lng = value
  }
  if ("fulfillment_options" in body) {
    if (!Array.isArray(body.fulfillment_options)) return NextResponse.json({ error: "invalid_fulfillment_options" }, { status: 400 })
    const methods = Array.from(new Set(body.fulfillment_options.filter((value): value is string =>
      typeof value === "string" && ALLOWED_FULFILLMENT.has(value),
    )))
    if (!methods.length || methods.length !== body.fulfillment_options.length) return NextResponse.json({ error: "invalid_fulfillment_options" }, { status: 400 })
    update.fulfillment_options = methods
  }

  if ("status" in body) {
    if (!["active", "inactive"].includes(body.status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 })
    update.status = body.status
  }

  let retainedPaths: string[] | null = null
  if ("photo_paths" in body) {
    if (!Array.isArray(body.photo_paths) || !body.photo_paths.every((value: unknown) => typeof value === "string")) {
      return NextResponse.json({ error: "invalid_photo_paths" }, { status: 400 })
    }
    const currentPaths: string[] = Array.isArray(drop.photo_paths) ? drop.photo_paths : []
    retainedPaths = Array.from(new Set(body.photo_paths as string[]))
    if (retainedPaths.some((path) => !currentPaths.includes(path))) {
      return NextResponse.json({ error: "unknown_photo_path" }, { status: 400 })
    }
    update.photo_paths = retainedPaths
  }

  const { data: updated, error: updateError } = await db
    .from("distribution_drops")
    .update(update)
    .eq("id", id)
    .eq("cell_id", drop.cell_id)
    .eq("status", drop.status)
    .is("order_id", null)
    .select("id, status")
    .maybeSingle()

  if (updateError) {
    console.error("[distribution/cell/drops/id] update error", updateError)
    return NextResponse.json({ error: "drop_update_failed" }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: "drop_changed_retry" }, { status: 409 })

  if (retainedPaths) {
    const currentPaths: string[] = Array.isArray(drop.photo_paths) ? drop.photo_paths : []
    const removed = currentPaths.filter((path) => !retainedPaths!.includes(path))
    if (removed.length) {
      const { error: removeError } = await auth.db.storage.from(BUCKET).remove(removed)
      if (removeError) console.error("[distribution/cell/drops/id] removed photo cleanup failed", removeError)
    }
  }

  return NextResponse.json({ ok: true, status: updated.status })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const db = supabaseAdmin()
  const { data: drop, error: lookupError } = await db
    .from("distribution_drops")
    .select("id, cell_id, product_id, status, photo_paths, order_id")
    .eq("id", id)
    .maybeSingle()

  if (lookupError) {
    console.error("[distribution/cell/drops/id] delete lookup error", lookupError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })

  const auth = await authorizeCellMember(request, drop.cell_id)
  if (!auth.ok) return auth.response
  if (!["active", "inactive"].includes(drop.status) || drop.order_id) {
    return NextResponse.json({ error: "drop_not_deletable" }, { status: 409 })
  }

  const { data: cancelled, error: cancelError } = await db
    .from("distribution_drops")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("cell_id", drop.cell_id)
    .eq("status", drop.status)
    .is("order_id", null)
    .select("id")
    .maybeSingle()

  if (cancelError) {
    console.error("[distribution/cell/drops/id] cancel error", cancelError)
    return NextResponse.json({ error: "drop_cancel_failed" }, { status: 500 })
  }
  if (!cancelled) return NextResponse.json({ error: "drop_changed_retry" }, { status: 409 })

  const { data: inventory, error: inventoryLookupError } = await db
    .from("distribution_cell_inventory")
    .select("id, quantity_available")
    .eq("cell_id", drop.cell_id)
    .eq("product_id", drop.product_id)
    .maybeSingle()

  if (inventoryLookupError || !inventory) {
    await db.from("distribution_drops").update({ status: drop.status, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "cancelled")
    console.error("[distribution/cell/drops/id] inventory lookup failed", inventoryLookupError)
    return NextResponse.json({ error: "inventory_restore_failed" }, { status: 500 })
  }

  const { data: restored, error: restoreError } = await db
    .from("distribution_cell_inventory")
    .update({ quantity_available: inventory.quantity_available + 1, updated_at: new Date().toISOString() })
    .eq("id", inventory.id)
    .eq("quantity_available", inventory.quantity_available)
    .select("id")
    .maybeSingle()

  if (restoreError || !restored) {
    await db.from("distribution_drops").update({ status: drop.status, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "cancelled")
    console.error("[distribution/cell/drops/id] inventory restore failed", restoreError)
    return NextResponse.json({ error: "inventory_restore_failed" }, { status: 500 })
  }

  const { error: eventError } = await db.from("distribution_inventory_events").insert({
    cell_id: drop.cell_id,
    product_id: drop.product_id,
    delta_quantity: 1,
    event_type: "drop_cancelled_restore",
    reference_id: drop.id,
    created_by_user_id: auth.user.id,
    note: "Cancelled unused drop; item returned to available inventory",
  })
  if (eventError) console.error("[distribution/cell/drops/id] inventory audit event failed", eventError)

  const paths: string[] = Array.isArray(drop.photo_paths) ? drop.photo_paths : []
  if (paths.length) {
    const { error: removeError } = await auth.db.storage.from(BUCKET).remove(paths)
    if (removeError) console.error("[distribution/cell/drops/id] photo cleanup failed", removeError)
  }

  return NextResponse.json({ ok: true, deleted: true })
}
