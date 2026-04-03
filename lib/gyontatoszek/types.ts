export interface GyontatasRequest {
  confession: string;
}

export interface GyontatasResponse {
  response: string;
}

export type SafetyResult =
  | { safe: true }
  | { safe: false; reason: string; fallback: string };
