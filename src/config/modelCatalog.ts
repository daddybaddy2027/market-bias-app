export type AccessTier = "Free" | "Pro";
export type ModelKind = "direction" | "range" | "hybrid";
export type PerformanceSource =
  | "verified_live"
  | "walk_forward_evaluation"
  | "range_history"
  | "collecting";

export type PerformanceStat = {
  source: PerformanceSource;
  label: string;
  accuracy?: number;
  n?: number;
  hits?: number;
  averageSignedPips?: number;
  profitFactor?: number;
  expectancyPips?: number;
  maxDrawdownPips?: number;
  note?: string;
  period?: string;
};

export type IndependentStat = {
  accuracy: number;
  n: number;
  hits: number;
  label: string;
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
  status: "production" | "live_verification" | "range" | "candidate";
  performance: PerformanceStat;
  independent?: IndependentStat;
  secondaryPerformance?: PerformanceStat[];
};

export const MODEL_CATALOG: ModelDefinition[] = [
  {
    order: 1,
    modelKey: "EURUSD_3H_PROD_V1",
    aliases: ["EURUSD_3H_PROD_V1", "PROD_V1"],
    asset: "EURUSD",
    horizonH: 3,
    displayName: "EURUSD 3h Production Direction",
    shortName: "EURUSD 3h",
    kind: "direction",
    tier: "Pro",
    family: "prod_v1",
    purpose: "Short-horizon directional model with verified live history.",
    status: "production",
    performance: {
      source: "verified_live",
      label: "Verified live accuracy",
      accuracy: 0.714,
      n: 21,
      hits: 15,
      period: "13–15 Jul 2026",
      note: "Twenty-one ordinary live signals from the stored production history.",
    },
    independent: {
      accuracy: 0.8,
      n: 10,
      hits: 8,
      label: "Independent non-overlapping sample",
    },
  },
  {
    order: 2,
    modelKey: "USDJPY_6H_V3_STRICT",
    aliases: ["USDJPY_6H_V3_STRICT", "USDJPY_6H_V3"],
    asset: "USDJPY",
    horizonH: 6,
    displayName: "USDJPY 6h V3 Direction",
    shortName: "USDJPY 6h",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "Cross-asset USDJPY direction model under live verification.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.7563,
      n: 238,
      expectancyPips: 28.52,
      profitFactor: 6.46,
      note: "Purged out-of-sample walk-forward evaluation. Not live accuracy.",
    },
  },
  {
    order: 3,
    modelKey: "USDJPY_12H_MLP_WIDE",
    aliases: ["USDJPY_12H_MLP_WIDE", "USDJPY_12H_MLP_G1_WIDE_C6"],
    asset: "USDJPY",
    horizonH: 12,
    displayName: "USDJPY 12h MLP Range",
    shortName: "USDJPY 12h Range",
    kind: "range",
    tier: "Pro",
    family: "mlp_live_v1",
    group: "mlp_live_v1",
    purpose: "Wide probabilistic range model for USDJPY.",
    status: "range",
    performance: {
      source: "range_history",
      label: "Range-path accuracy",
      accuracy: 0.857,
      n: 35,
      note: "Stored model range-history sample.",
    },
  },
  {
    order: 4,
    modelKey: "GBPJPY_12H_LEGACY",
    aliases: ["GBPJPY_12H_LEGACY", "LEGACY_JPY_12H"],
    asset: "GBPJPY",
    horizonH: 12,
    displayName: "GBPJPY 12h Broad Range",
    shortName: "GBPJPY 12h Range",
    kind: "range",
    tier: "Pro",
    family: "legacy_jpy_12h",
    purpose: "Broad 12-hour range model with long verified path history.",
    status: "range",
    performance: {
      source: "range_history",
      label: "Range-path accuracy",
      accuracy: 0.933,
      n: 164,
      note: "Verified stored range-path history.",
    },
  },
  {
    order: 5,
    modelKey: "EURUSD_12H_FINAL_APP_V2",
    aliases: ["EURUSD_12H_FINAL_APP_V2"],
    asset: "EURUSD",
    horizonH: 12,
    displayName: "EURUSD 12h Final V2",
    shortName: "EURUSD 12h V2",
    kind: "direction",
    tier: "Pro",
    family: "clean_pro_final_app_v2",
    purpose: "Selective EURUSD 12-hour direction model.",
    status: "production",
    performance: {
      source: "verified_live",
      label: "Verified live accuracy",
      accuracy: 0.60000000,
      n: 20,
      hits: 12,
      averageSignedPips: 6.88,
      period: "21–22 Jul 2026",
      note: "Stored live prediction history using the current production threshold.",
    },
    independent: {
      accuracy: 0.50000000,
      n: 2,
      hits: 1,
      label: "Independent non-overlapping sample",
    },
  },
  {
    order: 6,
    modelKey: "EURUSD_12H_MLP_COMBINED",
    aliases: [
      "EURUSD_12H_MLP_COMBINED",
      "EURUSD_12H_MLP_WIDE",
      "EURUSD_12H_MLP_CONS",
      "EURUSD_12H_MLP_G1_WIDE_C6",
      "EURUSD_12H_MLP_G2_CONS_C6",
    ],
    asset: "EURUSD",
    horizonH: 12,
    displayName: "EURUSD 12h MLP Wide / Conservative",
    shortName: "EURUSD 12h MLP",
    kind: "hybrid",
    tier: "Pro",
    family: "mlp_live_v1",
    group: "mlp_live_v1",
    purpose: "Two complementary MLP variants shown as one model family.",
    status: "candidate",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation summary",
      note: "Wide and conservative variants remain separately tracked in history.",
    },
    secondaryPerformance: [
      {
        source: "walk_forward_evaluation",
        label: "Wide evaluation accuracy",
        accuracy: 0.81,
        n: 21,
      },
      {
        source: "walk_forward_evaluation",
        label: "Conservative evaluation accuracy",
        accuracy: 0.7,
        n: 20,
      },
    ],
  },
  {
    order: 7,
    modelKey: "GBPUSD_12H_FINAL_APP_V2",
    aliases: ["GBPUSD_12H_FINAL_APP_V2"],
    asset: "GBPUSD",
    horizonH: 12,
    displayName: "GBPUSD 12h Final V2",
    shortName: "GBPUSD 12h",
    kind: "direction",
    tier: "Free",
    family: "clean_pro_final_app_v2",
    purpose: "Selective GBPUSD 12-hour direction model.",
    status: "candidate",
    performance: {
      source: "verified_live",
      label: "Verified live accuracy",
      accuracy: 0.83333333,
      n: 18,
      hits: 15,
      averageSignedPips: 22.36,
      period: "21–22 Jul 2026",
      note: "Stored live prediction history using the current production threshold.",
    },
    independent: {
      accuracy: 1.00000000,
      n: 3,
      hits: 3,
      label: "Independent non-overlapping sample",
    },
  },
  {
    order: 8,
    modelKey: "EURUSD_3H_V3_STRICT",
    aliases: ["EURUSD_3H_V3_STRICT", "EURUSD_3H_V3"],
    asset: "EURUSD",
    horizonH: 3,
    displayName: "EURUSD 3h V3 Direction",
    shortName: "EURUSD 3h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "V3 ensemble with separate long and short experts.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.7474,
      n: 293,
      expectancyPips: 13.82,
      profitFactor: 4.48,
      maxDrawdownPips: -122.45,
      note: "Purged out-of-sample walk-forward evaluation. Not live accuracy.",
    },
  },
  {
    order: 9,
    modelKey: "EURUSD_6H_V3_STRICT",
    aliases: ["EURUSD_6H_V3_STRICT", "EURUSD_6H_V3"],
    asset: "EURUSD",
    horizonH: 6,
    displayName: "EURUSD 6h V3 Direction",
    shortName: "EURUSD 6h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "Medium-horizon EURUSD cross-asset direction model.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.7237,
      n: 76,
      expectancyPips: 18.85,
      profitFactor: 4.24,
      note: "Purged out-of-sample walk-forward evaluation. Not live accuracy.",
    },
  },
  {
    order: 10,
    modelKey: "GBPUSD_6H_V3_STRICT",
    aliases: ["GBPUSD_6H_V3_STRICT", "GBPUSD_6H_V3"],
    asset: "GBPUSD",
    horizonH: 6,
    displayName: "GBPUSD 6h V3 Direction",
    shortName: "GBPUSD 6h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "Selective GBPUSD V3 direction model.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.7692,
      n: 52,
      expectancyPips: 29.78,
      profitFactor: 5.57,
      note: "Purged out-of-sample walk-forward evaluation. Smaller signal sample.",
    },
  },
  {
    order: 11,
    modelKey: "USDJPY_12H_V3_STRICT",
    aliases: ["USDJPY_12H_V3_STRICT", "USDJPY_12H_V3"],
    asset: "USDJPY",
    horizonH: 12,
    displayName: "USDJPY 12h V3 Direction",
    shortName: "USDJPY 12h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "Longer-horizon USDJPY V3 direction model.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.7867,
      n: 75,
      expectancyPips: 37.9,
      profitFactor: 6.39,
      note: "Purged out-of-sample walk-forward evaluation. Not live accuracy.",
    },
  },
  {
    order: 12,
    modelKey: "AUDUSD_6H_V3_STRICT",
    aliases: ["AUDUSD_6H_V3_STRICT", "AUDUSD_6H_V3"],
    asset: "AUDUSD",
    horizonH: 6,
    displayName: "AUDUSD 6h V3 Direction",
    shortName: "AUDUSD 6h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "AUDUSD V3 ensemble with balanced long and short experts.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.709,
      n: 134,
      expectancyPips: 12.28,
      profitFactor: 3.85,
      note: "Purged out-of-sample walk-forward evaluation. Not live accuracy.",
    },
  },
  {
    order: 13,
    modelKey: "XAUUSD_6H_V3_STRICT",
    aliases: ["XAUUSD_6H_V3_STRICT", "XAUUSD_6H_V3"],
    asset: "XAUUSD",
    horizonH: 6,
    displayName: "XAUUSD 6h V3 Direction",
    shortName: "XAUUSD 6h V3",
    kind: "direction",
    tier: "Pro",
    family: "v3_strict",
    group: "v3_multi_asset_v1",
    purpose: "Gold V3 directional model with cross-asset rates and equity context.",
    status: "live_verification",
    performance: {
      source: "walk_forward_evaluation",
      label: "Evaluation accuracy",
      accuracy: 0.681,
      n: 116,
      expectancyPips: 110.33,
      profitFactor: 3.31,
      note: "Gold-point scale differs from FX pips. Evaluation is not live performance.",
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
    asset?.model_family,
    asset?.model_group,
    `${symbol}_${horizon}H_${modelSlug(asset?.model_family ?? asset?.source)}`,
  ];

  if (symbol === "EURUSD" && horizon === 3 && (asset?.source === "prod_v1" || asset?.model_family === "prod_v1")) {
    values.push("EURUSD_3H_PROD_V1");
  }
  if (asset?.source === "final_app_v2" || asset?.model_family === "clean_pro_final_app_v2") {
    values.push(`${symbol}_${horizon}H_FINAL_APP_V2`);
  }
  if (asset?.source === "legacy_jpy_12h" || asset?.model_family === "legacy_jpy_12h") {
    values.push(`${symbol}_${horizon}H_LEGACY`);
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
    const family = String(asset?.model_family ?? asset?.source ?? "").toLowerCase();
    return symbol === model.asset && horizon === model.horizonH && family === model.family.toLowerCase();
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
  if (typeof stat.accuracy !== "number") return "Collecting";
  const n = typeof stat.n === "number" ? ` · n=${stat.n}` : "";
  return `${(stat.accuracy * 100).toFixed(1)}%${n}`;
}
