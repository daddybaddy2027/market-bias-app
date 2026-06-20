export type AccessTier =
  | "Free"
  | "Pro";

/*
  Keep the permanent lock system enabled, but temporarily bypass it
  while the public beta is active.
*/
export const ENABLE_PRO_LOCKS =
  true;

export const PUBLIC_PREVIEW_MODE =
  true;

export const PUBLIC_PREVIEW_PERFORMANCE =
  true;

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

export function canViewModelPerformance(
  symbol: string,
  horizonH: number,
  userIsPro = false
) {
  if (PUBLIC_PREVIEW_PERFORMANCE) {
    return true;
  }

  return (
    userIsPro ||
    getModelTier(
      symbol,
      horizonH
    ) === "Free"
  );
}

export function isFreeDriver(
  key?: string,
  title?: string
) {
  if (PUBLIC_PREVIEW_MODE) {
    return true;
  }

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