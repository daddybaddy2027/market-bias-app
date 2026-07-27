export type AccessTier = "Free" | "Pro";
export type ModelKind = "direction" | "consensus_direction" | "hybrid";
export type PerformanceSource =
  | "verified_live"
  | "strict_replay"
  | "collecting";

export type PerformanceStat = {
  source: PerformanceSource;
  label: string;
  accuracy?: number;
  n?: number;
  hits?: number;
  totalSignedPips?: number;
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
  status: "production" | "pilot";
  performance: PerformanceStat;
  independent?: IndependentStat;
  secondaryPerformance?: PerformanceStat[];
};

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
    tier: "Free",
    family: "clean_pro_final_app_v2",
    purpose: "Selective 12-hour GBPUSD directional bias with live production history.",
    status: "production",
    performance: {
      source: "strict_replay",
      label: "Strict replay accuracy",
      accuracy: 0.6086956522,
      n: 23,
      hits: 14,
      totalSignedPips: 200.1,
      note: "Threshold-approved session signals. Forecast performance remains separate from the +40 pip partial-profit and break-even trade-management result.",
    },
    independent: {
      accuracy: 0.625,
      n: 8,
      hits: 5,
      totalSignedPips: 66.1,
      label: "Independent signal episodes",
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
    purpose: "Short-horizon EURUSD directional model retained from the verified production set.",
    status: "production",
    performance: {
      source: "verified_live",
      label: "Verified live accuracy",
      accuracy: 0.714,
      n: 21,
      hits: 15,
      period: "13–15 Jul 2026",
      note: "Stored production history. The 0.65 threshold is now part of the frozen production contract.",
    },
    independent: {
      accuracy: 0.8,
      n: 10,
      hits: 8,
      label: "Independent signal episodes",
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
    purpose: "Medium-horizon EURUSD directional model selected by the strict no-leak replay.",
    status: "production",
    performance: {
      source: "strict_replay",
      label: "Strict replay accuracy",
      accuracy: 0.8333333333,
      n: 24,
      hits: 20,
      totalSignedPips: 218.8,
      note: "Session-gated threshold-approved signals using the frozen prob_up rule at 0.51.",
    },
    independent: {
      accuracy: 0.75,
      n: 12,
      hits: 9,
      totalSignedPips: 57.6,
      label: "Independent signal episodes",
    },
  },
  {
    order: 4,
    modelKey: "EURUSD_12H_CONSENSUS",
    aliases: [
      "EURUSD_12H_CONSENSUS",
      "EURUSD_12H_FINAL_APP_V2",
      "EURUSD_12H_MLP_G2_CONS_C6",
      "EURUSD_12H_MLP_G1_WIDE_C6",
    ],
    asset: "EURUSD",
    horizonH: 12,
    displayName: "EURUSD 12h Model Consensus",
    shortName: "EURUSD 12h Consensus",
    kind: "consensus_direction",
    tier: "Pro",
    family: "production_consensus_v2",
    group: "eurusd_12h_consensus",
    purpose: "A public signal appears only when at least two of three frozen EURUSD 12-hour engines agree.",
    status: "production",
    performance: {
      source: "collecting",
      label: "Consensus live validation",
      note: "Consensus episodes are tracked from launch. Component replay results are shown separately and are not presented as one combined accuracy figure.",
    },
    secondaryPerformance: [
      {
        source: "strict_replay",
        label: "Final V2 component",
        accuracy: 1,
        n: 11,
        hits: 11,
        totalSignedPips: 266.2,
      },
      {
        source: "strict_replay",
        label: "MLP Conservative component",
        accuracy: 1,
        n: 10,
        hits: 10,
        totalSignedPips: 265.6,
      },
      {
        source: "strict_replay",
        label: "MLP Wide component",
        accuracy: 0.875,
        n: 8,
        hits: 7,
        totalSignedPips: 183.7,
      },
    ],
  },
  {
    order: 5,
    modelKey: "AUDUSD_12H_MLP_DIRECTION",
    aliases: ["AUDUSD_12H_MLP_DIRECTION", "AUDUSD_12H_MLP_G0_CONS_C6"],
    asset: "AUDUSD",
    horizonH: 12,
    displayName: "AUDUSD 12h MLP Direction",
    shortName: "AUDUSD 12h",
    kind: "direction",
    tier: "Pro",
    family: "mlp_live_v1",
    group: "mlp_live_v1",
    purpose: "Selective AUDUSD 12-hour directional engine using the frozen 204-feature schema.",
    status: "pilot",
    performance: {
      source: "strict_replay",
      label: "Strict replay accuracy",
      accuracy: 0.6875,
      n: 16,
      hits: 11,
      totalSignedPips: 143.5,
      note: "One production product is shown. The duplicate Wide/Conservative directional output is not counted as a second model.",
    },
    independent: {
      accuracy: 0.5,
      n: 6,
      hits: 3,
      totalSignedPips: 56.6,
      label: "Independent signal episodes",
    },
  },
  {
    order: 6,
    modelKey: "USDJPY_12H_MLP_DIRECTION_RANGE",
    aliases: ["USDJPY_12H_MLP_DIRECTION_RANGE", "USDJPY_12H_MLP_G1_WIDE_C6", "USDJPY_12H_MLP_WIDE"],
    asset: "USDJPY",
    horizonH: 12,
    displayName: "USDJPY 12h MLP Direction & Range",
    shortName: "USDJPY 12h",
    kind: "hybrid",
    tier: "Pro",
    family: "mlp_live_v1",
    group: "mlp_live_v1",
    purpose: "Selective USDJPY direction with its genuine model range retained when the backend supplies one.",
    status: "pilot",
    performance: {
      source: "strict_replay",
      label: "Strict replay accuracy",
      accuracy: 0.5625,
      n: 16,
      hits: 9,
      totalSignedPips: 115.9,
      note: "The direction and range are shown together. No synthetic path or invented target is drawn.",
    },
    independent: {
      accuracy: 0.6666666667,
      n: 6,
      hits: 4,
      totalSignedPips: 58.2,
      label: "Independent signal episodes",
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

  if (symbol === "EURUSD" && horizon === 3 && (asset?.source === "prod_v1" || asset?.model_family === "prod_v1")) {
    values.push("EURUSD_3H_PROD_V1");
  }
  if (asset?.source === "final_app_v2" || asset?.model_family === "clean_pro_final_app_v2") {
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
  if (typeof stat.accuracy !== "number") return "Collecting";
  const n = typeof stat.n === "number" ? ` · n=${stat.n}` : "";
  return `${(stat.accuracy * 100).toFixed(1)}%${n}`;
}
