export type AccessTier = "Free" | "Pro";

/*
  PHASE 1:
  This is a visual product gate only.

  It improves the public product experience, but it is NOT secure access control.
  Real protection arrives in Phase 2 with authentication and backend filtering.
*/
export const ENABLE_PRO_LOCKS = true;

export const FREE_MODEL_KEYS = new Set([
  "GBPJPY-12",
  "EURUSD-6",
]);

export const PRO_MODEL_KEYS = new Set([
  "EURJPY-12",
  "EURUSD-3",
  "GBPAUD-3",
  "GBPAUD-6",
]);

export const HIDDEN_PUBLIC_SYMBOLS = new Set([
  "XAUUSD",
  "USDJPY",
]);

export function buildModelKey(
  symbol: string,
  horizonH: number
) {
  return `${symbol.toUpperCase()}-${horizonH}`;
}

export function getModelTier(
  symbol: string,
  horizonH: number
): AccessTier {
  const key = buildModelKey(symbol, horizonH);

  return FREE_MODEL_KEYS.has(key) ? "Free" : "Pro";
}

export function isModelPubliclyAllowed(
  symbol: string,
  horizonH: number
) {
  const key = buildModelKey(symbol, horizonH);

  return (
    !HIDDEN_PUBLIC_SYMBOLS.has(symbol.toUpperCase()) &&
    (
      FREE_MODEL_KEYS.has(key) ||
      PRO_MODEL_KEYS.has(key)
    )
  );
}

export function isModelLocked(
  symbol: string,
  horizonH: number
) {
  return (
    ENABLE_PRO_LOCKS &&
    getModelTier(symbol, horizonH) === "Pro"
  );
}

/*
  Free:
  - Equities
  - Volatility
  - US Dollar
  - JPY Haven

  Pro:
  - Yields / Rates
  - Metals
  - Risk Appetite
  - any future deeper cross-asset driver
*/
export function isFreeDriver(
  key?: string,
  title?: string
) {
  const text = `${key ?? ""} ${title ?? ""}`
    .toLowerCase()
    .replace(/[_-]/g, " ");

  return (
    text.includes("equities") ||
    text.includes("equity") ||
    text.includes("volatility") ||
    text.includes("vix") ||
    text.includes("us dollar") ||
    text.includes("usd") ||
    text.includes("jpy haven") ||
    text.includes("jpy")
  );
}