export type AccessTier =
  | "Free"
  | "Pro";

export const ENABLE_PRO_LOCKS =
  true;

export const PUBLIC_PREVIEW_MODE = true;

export const FREE_MODEL_KEYS =
  new Set([
    "GBPJPY-12",
    "EURUSD-6",
  ]);

export const PRO_MODEL_KEYS =
  new Set([
    "EURJPY-12",
    "EURUSD-3",
    "GBPAUD-3",
    "GBPAUD-6",
  ]);

export const HIDDEN_PUBLIC_SYMBOLS =
  new Set([
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
  const key = buildModelKey(
    symbol,
    horizonH
  );

  return FREE_MODEL_KEYS.has(key)
    ? "Free"
    : "Pro";
}

export function isModelPubliclyAllowed(
  symbol: string,
  horizonH: number
) {
  const normalized =
    symbol.toUpperCase();

  const key = buildModelKey(
    normalized,
    horizonH
  );

  return (
    !HIDDEN_PUBLIC_SYMBOLS.has(
      normalized
    ) &&
    (
      FREE_MODEL_KEYS.has(key) ||
      PRO_MODEL_KEYS.has(key)
    )
  );
}

export function isModelLocked(
  symbol: string,
  horizonH: number,
  userIsPro = false
) {
  if (PUBLIC_PREVIEW_MODE) {
    return false;
  }

  return (
    ENABLE_PRO_LOCKS &&
    getModelTier(
      symbol,
      horizonH
    ) === "Pro" &&
    !userIsPro
  );
}

export function isFreeDriver(
  key?: string,
  title?: string
) {
  const text =
    `${key ?? ""} ${title ?? ""}`
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
