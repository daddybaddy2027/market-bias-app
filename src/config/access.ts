import {
  MODEL_CATALOG,
  assetModelCandidates,
  findModelDefinition,
  modelSlug,
  type AccessTier,
} from "./modelCatalog";

export type { AccessTier };

export const ENABLE_PRO_LOCKS = true;
export const PUBLIC_PREVIEW_MODE = false;
export const PUBLIC_PREVIEW_PERFORMANCE = true;

export const FREE_MODEL_KEYS = new Set(
  MODEL_CATALOG
    .filter((model) => model.tier === "Free")
    .flatMap((model) => [model.modelKey, ...(model.aliases ?? [])])
    .map(modelSlug)
);

export const PRO_MODEL_KEYS = new Set(
  MODEL_CATALOG
    .filter((model) => model.tier === "Pro")
    .flatMap((model) => [model.modelKey, ...(model.aliases ?? [])])
    .map(modelSlug)
);

export const HIDDEN_PUBLIC_SYMBOLS = new Set<string>();

export function buildModelKey(
  symbol: string,
  horizonH: number,
  modelId?: string | null
) {
  const base = `${symbol.toUpperCase()}-${horizonH}`;
  const slug = modelSlug(modelId);
  return slug ? `${base}-${slug}` : base;
}

function candidates(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  const pseudoAsset = {
    asset: symbol.toUpperCase(),
    horizon_h: horizonH,
    model_id: modelId,
    model_family: modelFamily,
    model_group: modelGroup,
    source: modelFamily,
  };

  return assetModelCandidates(pseudoAsset);
}

export function getModelTier(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
): AccessTier {
  const keys = candidates(
    symbol,
    horizonH,
    modelId,
    modelFamily,
    modelGroup
  );

  for (const key of keys) {
    const model = findModelDefinition(key);
    if (model) return model.tier;
  }

  // Exact asset/horizon fallback is used only when there is one catalog model
  // for that pair. It deliberately refuses ambiguous cases such as EURUSD 3h.
  const samePair = MODEL_CATALOG.filter(
    (model) => model.asset === symbol.toUpperCase() && model.horizonH === horizonH
  );

  return samePair.length === 1 ? samePair[0].tier : "Pro";
}

export function isModelPubliclyAllowed(
  symbol: string,
  horizonH: number,
  modelId?: string | null,
  modelFamily?: string | null,
  modelGroup?: string | null
) {
  const normalized = symbol.toUpperCase();
  if (HIDDEN_PUBLIC_SYMBOLS.has(normalized)) return false;

  const keys = candidates(
    normalized,
    horizonH,
    modelId,
    modelFamily,
    modelGroup
  );

  if (keys.some((key) => Boolean(findModelDefinition(key)))) return true;

  return MODEL_CATALOG.some(
    (model) => model.asset === normalized && model.horizonH === horizonH
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
  if (PUBLIC_PREVIEW_MODE) return false;

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
  if (PUBLIC_PREVIEW_PERFORMANCE) return true;

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

export function isFreeDriver(key?: string, title?: string) {
  if (PUBLIC_PREVIEW_MODE) return true;

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
