import { describe, expect, it } from "vitest";

import { buildRevolutPaymentUrl } from "./revolutPendingOrders";

describe("buildRevolutPaymentUrl", () => {
  it("uses the cukorkabolt Revolut revtag in checkout links", () => {
    const url = buildRevolutPaymentUrl(1000, "REF-#123456");

    expect(url).toContain("https://revolut.me/cukorkabolt");
    expect(url).toContain("amount=1000");
    expect(url).toContain("note=REF-%23123456");
  });
});
