export type AccessTier =
  | "Free"
  | "Pro";

/*
  Permanent lock system stays available, but public beta bypasses it.
  During public beta, current model outputs AND verified accuracy/history
  are intentionally unlocked for transparency.
*/
export const ENABLE_PRO_LOCKS =
  true;

export const PUBLIC_PREVIEW_MODE =
  true;

export const PUBLIC_PREVIEW_PERFORMANCE =
  true;

export const FREE_MODEL_KEYS =
  new Set([
    // Existing public / validation models
    "GBPJPY-12",
    "EURUSD-6",

    // New final_app_v2 candidates that can stay visible in public beta
    "AUDUSD-12",
    "USDJPY-6",
  ]);

export const PRO_MODEL_KEYS =
  new Set([
    // Existing old/prod candidates
    "EURUSD-3",
    "GBPAUD-3",
    "GBPAUD-6",

    // Existing legacy candidate kept as Pro-tier metadata if re-enabled later
    "EURJPY-12",

    // New final_app_v2 validation / candidate models
    "EURUSD-12",
    "GBPUSD-12",
    "USDJPY-12",
  ]);

/*
  Nothing is hidden in public beta.
  When beta ends, hide experimental symbols here instead of deleting models.
*/
export const HIDDEN_PUBLIC_SYMBOLS =
  new Set<string>([]);

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
