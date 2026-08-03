export type AccessTier = "Free" | "Pro";
export type ModelKind = "direction" | "consensus_direction" | "hybrid" | "range";
export type PerformanceSource =
  | "verified_live"
  | "strict_replay"
  | "collecting"
  | "walk_forward_evaluation"
  | "range_history";

export type PerformanceStat = {
  source: PerformanceSource;
  label: string;
  accuracy?: number;
  n?: number;
  hits?: number;
  totalSignedPips?: number;
  averageSignedPips?: number;
  expectancyPips?: number;
  profitFactor?: number;
  maxDrawdownPips?: number;
  note?: string;
  period?: string;
};

export type IndependentStat = {
  accuracy: number;
  n: number;
  hits: number;
  label: string;
  totalSignedPips?: number;
};

export type ModelDefinition = {
  order: number;
  modelKey: string;
  aliases?: string[];
  asset: string;
  horizonH: number;
  displayName: string;
  shortName: string;
  kind: ModelKind;
  tier: AccessTier;
  family: string;
  group?: string;
  purpose: string;
  status: "production" | "pilot" | "live_verification" | "range" | "candidate";
  performance: PerformanceStat;
  independent?: IndependentStat;
  secondaryPerformance?: PerformanceStat[];
};

// Only models that currently satisfy the commercial production policy belong
// here. Quarantined, research and shadow engines remain outside the app until
// their independent non-overlapping live sample clears the release threshold.
export const MODEL_CATALOG: ModelDefinition[] = [
  {
    order: 1,
    modelKey: "GBPUSD_12H_FINAL_APP_V2",
    aliases: ["GBPUSD_12H_FINAL_APP_V2"],
    asset: "GBPUSD",
    horizonH: 12,
    displayName: "GBPUSD 12h Final V2",
    shortName: "GBPUSD 12h",
    kind: "direction",
    tier: "Pro",
    family: "clean_pro_final_app_v2",
    purpose: "Selective 12-hour GBPUSD directional model with stored production history.",
    status: "production",
    performance: {
      source: "collecting",
      label: "Live dual scorecard",
      note: "All published predictions and independent non-overlapping episodes are calculated separately from stored outcomes.",
    },
  },
  {
    order: 2,
    modelKey: "EURUSD_3H_PROD_V1",
    aliases: ["EURUSD_3H_PROD_V1", "PROD_V1"],
    asset: "EURUSD",
    horizonH: 3,
    displayName: "EURUSD 3h Production Direction",
    shortName: "EURUSD 3h",
    kind: "direction",
    tier: "Pro",
    family: "prod_v1",
    purpose: "Short-horizon EURUSD production direction model.",
    status: "production",
    performance: {
      source: "collecting",
      label: "Live dual scorecard",
      note: "All published predictions and independent non-overlapping episodes are calculated separately from stored outcomes.",
    },
  },
  {
    order: 3,
    modelKey: "EURUSD_6H_FINAL_APP_V2",
    aliases: ["EURUSD_6H_FINAL_APP_V2"],
    asset: "EURUSD",
    horizonH: 6,
    displayName: "EURUSD 6h Final V2",
    shortName: "EURUSD 6h",
    kind: "direction",
    tier: "Pro",
    family: "clean_pro_final_app_v2",
    purpose: "Medium-horizon EURUSD directional model selected from the frozen production set.",
    status: "production",
    performance: {
      source: "collecting",
      label: "Live dual scorecard",
      note: "All published predictions and independent non-overlapping episodes are calculated separately from stored outcomes.",
    },
  },
];

export const MODEL_BY_KEY = new Map(
  MODEL_CATALOG.map((model) => [model.modelKey, model])
);

export function modelSlug(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_");
}

export function assetModelCandidates(asset: any): string[] {
  const symbol = String(asset?.asset ?? asset?.symbol ?? "").toUpperCase();
  const horizon = Number(asset?.horizon_h ?? 0);
  const values = [
    asset?.model_key,
    asset?.model_id,
    asset?.product_key,
    asset?.model_family,
    asset?.model_group,
    `${symbol}_${horizon}H_${modelSlug(asset?.model_family ?? asset?.source)}`,
  ];

  if (
    symbol === "EURUSD" &&
    horizon === 3 &&
    (asset?.source === "prod_v1" || asset?.model_family === "prod_v1")
  ) {
    values.push("EURUSD_3H_PROD_V1");
  }

  if (
    asset?.source === "final_app_v2" ||
    asset?.model_family === "clean_pro_final_app_v2"
  ) {
    values.push(`${symbol}_${horizon}H_FINAL_APP_V2`);
  }

  return values.map(modelSlug).filter(Boolean);
}

export function findAssetForModel(model: ModelDefinition, assets: any[]) {
  const aliases = new Set([model.modelKey, ...(model.aliases ?? [])].map(modelSlug));
  const exact = assets.find((asset) =>
    assetModelCandidates(asset).some((candidate) => aliases.has(candidate))
  );
  if (exact) return exact;

  return assets.find((asset) => {
    const symbol = String(asset?.asset ?? asset?.symbol ?? "").toUpperCase();
    const horizon = Number(asset?.horizon_h ?? 0);
    return symbol === model.asset && horizon === model.horizonH;
  });
}

export function findModelDefinition(key?: string | null) {
  const normalized = modelSlug(key);
  return MODEL_CATALOG.find((model) =>
    [model.modelKey, ...(model.aliases ?? [])].map(modelSlug).includes(normalized)
  );
}

export function modelRoute(model: ModelDefinition) {
  return `${model.asset}-${model.horizonH}h-${model.modelKey}`;
}

export function accuracyText(stat: PerformanceStat) {
  if (typeof stat.accuracy !== "number") return "Live scorecard";
  const n = typeof stat.n === "number" ? ` · n=${stat.n}` : "";
  return `${(stat.accuracy * 100).toFixed(1)}%${n}`;
}
