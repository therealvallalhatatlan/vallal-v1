import { describe, expect, it } from "vitest";
import { formatBookRegistrySerial, isValidRegistryToken, isValidRegistryUuid, parseBookRegistryQuantity } from "./bookRegistry";
import { createBookRegistryToken, hashBookRegistryToken } from "./bookRegistryTokens";

describe("book registry serial labels", () => {
  it("formats per-edition serials consistently", () => {
    expect(formatBookRegistrySerial("I", 1)).toBe("I-001");
    expect(formatBookRegistrySerial("I", 101)).toBe("I-101");
    expect(formatBookRegistrySerial("II", 81)).toBe("II-081");
  });

  it("rejects invalid prefixes and serial numbers", () => {
    expect(() => formatBookRegistrySerial("book_1", 1)).toThrow();
    expect(() => formatBookRegistrySerial("II", 0)).toThrow();
    expect(() => formatBookRegistrySerial("II", 1.5)).toThrow();
  });
});

describe("book registry one-time tokens", () => {
  it("generates a random URL-safe token that passes input validation", () => {
    const token = createBookRegistryToken();
    expect(isValidRegistryToken(token)).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
  });

  it("stores a SHA-256 digest rather than the raw token", () => {
    const token = createBookRegistryToken();
    const digest = hashBookRegistryToken(token);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe(token);
    expect(hashBookRegistryToken(token)).toBe(digest);
  });

  it("accepts UUID IDs and rejects arbitrary strings", () => {
    expect(isValidRegistryUuid("9b2f9fc2-2fbd-4eac-b0db-4f7dfc9e0c23")).toBe(true);
    expect(isValidRegistryUuid("not-a-uuid")).toBe(false);
  });
});