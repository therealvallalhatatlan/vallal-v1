export type UserCircleCode = "outside" | "a" | "inner" | "core";

export type UserCircle = {
  code: UserCircleCode;
  label: string;
  spendHuf: number;
};

export function getUserCircle(spendHuf: number): UserCircle {
  const normalizedSpend = Number.isFinite(spendHuf) ? Math.max(0, Math.round(spendHuf)) : 0;

  if (normalizedSpend >= 25000) {
    return { code: "core", label: "SZŰK BELSŐ KÖR", spendHuf: normalizedSpend };
  }

  if (normalizedSpend >= 10000) {
    return { code: "inner", label: "BELSŐ KÖR", spendHuf: normalizedSpend };
  }

  if (normalizedSpend > 0) {
    return { code: "a", label: "A KÖR", spendHuf: normalizedSpend };
  }

  return { code: "outside", label: "KÖRÖN KÍVÜL", spendHuf: 0 };
}
