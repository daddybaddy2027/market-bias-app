export type AccessTier =
  | "Free"
  | "Pro";

/*
  Launch mode:
  - Free users keep 4 useful model views.
  - Pro users unlock the complete current model set.
  - Pro cards can still show historical performance teasers.
  - Current bias / expected move / confidence / probability / status are locked.
*/
export const ENABLE_PRO_LOCKS =
  true;

export const PUBLIC_PREVIEW_MODE =
  false;

export const PUBLIC_PREVIEW_PERFORMANCE =
  true;

export const FREE_MODEL_KEYS =
  new Set([
    "EURUSD-3",
    "EURUSD-6",
    "USDJPY-6",
    "AUDUSD-12-AUDUSD_12H_MLP_G0_CONS_C6",
  ]);

export const PRO_MODEL_KEYS =
  new Set([
    "AUDUSD-12",
    "AUDUSD-12-AUDUSD_12H_MLP_G0_WIDE_C6",
    "EURUSD-12",
    "EURUSD-12-EURUSD_12H_MLP_G2_CONS_C6",
    "EURUSD-12-EURUSD_12H_MLP_G1_WIDE_C6",
    "GBPUSD-12",
    "USDJPY-12",
    "USDJPY-12-USDJPY_12H_MLP_G1_WIDE_C6",
    "GBPJPY-12",
  ]);

export const HIDDEN_PUBLIC_SYMBOLS =
  new Set<string>([]);

export function modelSlug(
  value?: string | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_");
}

export function buildModelKey(
  symbol: string,
  horizonH: number,
  modelId?: string | null
) {
  const base =
    `${symbol.toUpperCase()}-${horizonH}`;

  const slug =
    modelSlug(modelId);

  return slug
    ? `${base}-${slug}`
    : base;
}

function candidateKeys(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  const base =
    buildModelKey(
      symbol,
      horizonH
    );

  return [
    buildModelKey(
      symbol,
      horizonH,
      modelId
    ),
    buildModelKey(
      symbol,
      horizonH,
      modelFamily
    ),
    buildModelKey(
      symbol,
      horizonH,
      modelGroup
    ),
    base,
  ].filter(
    (value, index, array) =>
      value &&
      array.indexOf(value) === index
  );
}

export function getModelTier(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
): AccessTier {
  const keys =
    candidateKeys(
      symbol,
      horizonH,
      modelId,
      modelFamily,
      modelGroup
    );

  if (
    keys.some((key) =>
      FREE_MODEL_KEYS.has(key)
    )
  ) {
    return "Free";
  }

  if (
    keys.some((key) =>
      PRO_MODEL_KEYS.has(key)
    )
  ) {
    return "Pro";
  }

  return "Pro";
}

export function isModelPubliclyAllowed(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  const normalized =
    symbol.toUpperCase();

  if (
    HIDDEN_PUBLIC_SYMBOLS.has(
      normalized
    )
  ) {
    return false;
  }

  const keys =
    candidateKeys(
      normalized,
      horizonH,
      modelId,
      modelFamily,
      modelGroup
    );

  return keys.some(
    (key) =>
      FREE_MODEL_KEYS.has(key) ||
      PRO_MODEL_KEYS.has(key)
  );
}

export function isModelLocked(
  symbol: string,
  horizonH: number,
  userIsPro = false,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  if (PUBLIC_PREVIEW_MODE) {
    return false;
  }

  return (
    ENABLE_PRO_LOCKS &&
    getModelTier(
      symbol,
      horizonH,
      modelId,
      modelFamily,
      modelGroup
    ) === "Pro" &&
    !userIsPro
  );
}

export function canViewModelPerformance(
  symbol: string,
  horizonH: number,
  userIsPro = false,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  if (PUBLIC_PREVIEW_PERFORMANCE) {
    return true;
  }

  return (
    userIsPro ||
    getModelTier(
      symbol,
      horizonH,
      modelId,
      modelFamily,
      modelGroup
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