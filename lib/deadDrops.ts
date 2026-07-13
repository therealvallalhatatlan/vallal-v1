import { z } from "zod";

export const DEAD_DROP_BUCKET = "dead-drop-proofs";
export const DEAD_DROP_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const DEAD_DROP_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DEAD_DROP_ALIAS_STORAGE_KEY = "dead-drop.alias.v1";

export type DeadDropStatus = "active" | "claimed";

export type DeadDropCoordinates = {
  lat: number;
  lng: number;
};

export type DeadDropRecord = {
  id: string;
  status: DeadDropStatus;
  title: string;
  location_hint: string;
  coordinates: DeadDropCoordinates | null;
  anonymous_finder_alias: string | null;
  proof_image_url: string | null;
  proof_note: string | null;
  storage_path: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const DROP_SELECT_FIELDS = [
  "id",
  "status",
  "title",
  "location_hint",
  "coordinates",
  "anonymous_finder_alias",
  "proof_image_url",
  "proof_note",
  "storage_path",
  "claimed_at",
  "created_at",
  "updated_at",
].join(", ");

export const deadDropClaimSchema = z.object({
  dropId: z.string().uuid(),
  alias: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_\- ]+$/),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export function normalizeCoordinates(value: unknown): DeadDropCoordinates | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const lat = typeof candidate.lat === "number" ? candidate.lat : Number(candidate.lat);
  const lng = typeof candidate.lng === "number" ? candidate.lng : Number(candidate.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function normalizeDeadDropRow(row: Record<string, unknown>): DeadDropRecord {
  return {
    id: String(row.id ?? ""),
    status: row.status === "claimed" ? "claimed" : "active",
    title: String(row.title ?? ""),
    location_hint: String(row.location_hint ?? ""),
    coordinates: normalizeCoordinates(row.coordinates),
    anonymous_finder_alias:
      typeof row.anonymous_finder_alias === "string" ? row.anonymous_finder_alias : null,
    proof_image_url: typeof row.proof_image_url === "string" ? row.proof_image_url : null,
    proof_note: typeof row.proof_note === "string" ? row.proof_note : null,
    storage_path: typeof row.storage_path === "string" ? row.storage_path : null,
    claimed_at: typeof row.claimed_at === "string" ? row.claimed_at : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function buildDeadDropStoragePath(dropId: string, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `dead-drops/${dropId}/${Date.now()}_${randomPart}.${extension}`;
}