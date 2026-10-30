import type { FoxpostPickupPoint } from "@/types/foxpost";

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function parseFoxpostPickupPoint(value: unknown): FoxpostPickupPoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const operatorId = stringValue(raw.operator_id ?? raw.operatorId) || null;
  const placeId = stringValue(raw.place_id ?? raw.placeId) || null;
  const destinationId =
    stringValue(raw.destinationId) || operatorId || placeId || "";

  const zip = stringValue(raw.zip);
  const city = stringValue(raw.city);
  const street = stringValue(raw.street);
  const address =
    stringValue(raw.address) ||
    [zip, city, street].filter(Boolean).join(" ");

  const name = stringValue(raw.name);
  if (!destinationId || !name || !address) return null;

  const country = stringValue(raw.country).toUpperCase();
  if (country && country !== "HU") return null;

  return {
    destinationId,
    operatorId,
    placeId,
    name: name.slice(0, 150),
    address: address.slice(0, 200),
    zip: zip.slice(0, 20),
    city: city.slice(0, 100),
    street: street.slice(0, 120),
    findme: stringValue(raw.findme).slice(0, 400),
    variant: stringValue(raw.variant || raw.apmType || "FOXPOST").slice(0, 60),
    service: stringValue(raw.service).slice(0, 40),
    country: country || "HU",
  };
}

export function formatFoxpostPickupPoint(point: FoxpostPickupPoint): string {
  return [
    point.variant || "FOXPOST",
    point.destinationId,
    point.name,
    point.address,
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 240);
}

export function foxpostPickupPointMetadata(
  point: FoxpostPickupPoint,
): Record<string, string> {
  return {
    pickupPoint: formatFoxpostPickupPoint(point),
    pickupPointId: point.destinationId,
    pickupPointOperatorId: point.operatorId ?? "",
    pickupPointPlaceId: point.placeId ?? "",
    pickupPointName: point.name,
    pickupPointAddress: point.address,
    pickupPointCity: point.city,
    pickupPointZip: point.zip,
    pickupPointVariant: point.variant,
    pickupPointFindme: point.findme,
  };
}
