export type BookRegistryEdition = {
  code: string;
  title: string;
  serial_prefix: string;
};

export function formatBookRegistrySerial(prefix: string, serialNumber: number): string {
  if (!/^[IVXLCDM]+$/.test(prefix) || !Number.isSafeInteger(serialNumber) || serialNumber < 1) {
    throw new Error("Invalid book registry serial");
  }
  return prefix + "-" + String(serialNumber).padStart(3, "0");
}

export function isValidRegistryUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidRegistryToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(value);
}

/**
 * Parse trusted, server-authored Stripe metadata. Never infer book quantity
 * from all cart line items, which may include non-book merchandise.
 */
export function parseBookRegistryQuantity(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,2}$/.test(value)) return 1;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 100 ? quantity : 1;
}
