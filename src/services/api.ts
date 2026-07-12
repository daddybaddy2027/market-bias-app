import { supabase } from "../lib/supabase";

export type Bias =
  | "Bullish"
  | "Bearish"
  | "Neutral"
  | "Range"
  | "Range Only";

export type MarketDriver = {
  key: string;
  title: string;
  state: string;
  score?: number;
  strength: number;
  detail: string;
};

export type RegimeDriverScore = {
  key: string;
  label: string;
  score: number;
};

export type RegimeNarrative = {
  regimeCode?: string;
  headline?: string;
  confidence?: number;
  disagreement?: number;
  observed?: string;
  possibleDrivers?: string[];
  likelyBeneficiaries?: string[];
  likelyHeadwinds?: string[];
  howToUse?: string;
  dominantDrivers?: RegimeDriverScore[];
  currencyLeaders?: string[];
  currencyLaggards?: string[];
  driverScores?: Record<string, number>;
  methodNote?: string;
  blindSpots?: string[];
};


export type CurrencyStrengthItem = {
  code: string;
  name: string;
  score: number;
  rank?: number;
  bias: string;
  rawStrength?: number;
  note: string;
};

export type ApiAsset = {
  source?: string;
  model_family?: string;
  model_id?: string;
  model_key?: string;
  model_group?: string;
  model_label?: string;
  model_source?: string;
  model_key?: string;
  display_name?: string;
  short_name?: string;
  access_tier?: "free" | "pro" | "retired" | string;
  model_type?: "direction" | "range" | "monitoring" | string;
  model_mode?: string;
  model_purpose?: string;
  headline_metric?: string;
  public_note?: string;

  live_evaluated_n?: number | null;
  live_pending_n?: number | null;
  live_direction_n?: number | null;
  live_direction_hits?: number | null;
  live_direction_accuracy?: number | null;
  live_range_close_n?: number | null;
  live_range_close_accuracy?: number | null;
  live_range_path_n?: number | null;
  live_range_path_accuracy?: number | null;

  current_prediction_locked?: boolean;
  teaser_only?: boolean;
  locked?: boolean;

  asset: string;
  symbol?: string;
  display: string;

  time_utc?: string;
  time_belgrade?: string;
  horizon_h?: number;
  session?: string;

  bias: Bias;
  pred_dir?: number;

  pred_mu_12h_ret?: number;
  pred_sigma_12h?: number;
  pred_mu_ret?: number;
  expected_range_ret?: number;

  expectedMove?: string;
  expectedRange?: string;

  currentPrice?: number;
  close?: number;
  pred_future_close?: number;
  pred_future_close_12h?: number;
  projectedLow?: number;
  projectedHigh?: number;

  confidence?: number | null;
  confidence_label?: string;
  signal_strength?: string;

  prob_up?: number | null;
  prob_down?: number | null;
  prob_used?: number | null;
  prob_source_used?: string;
  threshold_used?: number | null;
  threshold_confidence?: number | null;
  public_status?: string;

  validation_direction_accuracy?: number | null;
  validation_win_rate?: number | null;
  validation_trades?: number | null;
  validation_total_pips?: number | null;
  validation_avg_week_pips?: number | null;
  validation_profitable_weeks?: number | null;
  validation_active_weeks?: number | null;
  validation_profit_factor?: number | null;
  validation_max_drawdown_pips?: number | null;
  validation_worst_week_pips?: number | null;
  validation_note?: string;

  tp1_pips?: number | null;
  tp2_pips?: number | null;
  sl_pips?: number | null;
  tp1_price?: number | null;
  tp2_price?: number | null;
  sl_price?: number | null;

  trade_management?: {
    strategy?: string;
    cooldown_bars?: number;
    entry_rule?: string;
    tp1_rule?: string;
    breakeven_rule?: string;
    tp2_rule?: string;
    sl_rule?: string;
    cost_pips_assumed?: number | null;
  };

  expert_top?: string;
  expert_profile?: string;
  model_status?: string;

  visible?: boolean;
  usable?: boolean;
  status?: string;

  range_pips?: number | null;
  range_dollars?: number | null;

  drivers?: string[];
  explanation?: string;

  macroContextShort?: string;
  macroContextLong?: string;
  contextBullets?: string[];
  regimeAlignment?: "Aligned" | "Mixed" | "Conflicted" | string;
  regimeConflictLevel?: "Low" | "Medium" | "High" | string;
  pairStrengthSpread?: number | null;
};


export type ModelCatalogItem = {
  model_key: string;
  display_name: string;
  short_name?: string;
  asset: string;
  horizon_h: number;
  access_tier: "free" | "pro" | "retired" | string;
  model_type: "direction" | "range" | "monitoring" | string;
  mode: string;
  purpose?: string;
  headline_metric?: string;
  public_note?: string;
  live_evaluated_n?: number | null;
  live_pending_n?: number | null;
  live_direction_n?: number | null;
  live_direction_hits?: number | null;
  live_direction_accuracy?: number | null;
  live_range_close_n?: number | null;
  live_range_close_accuracy?: number | null;
  live_range_path_n?: number | null;
  live_range_path_accuracy?: number | null;
  current_prediction_locked?: boolean;
  active_prediction_visible?: boolean;
  current_bias?: string | null;
  confidence?: number | null;
  model_status?: string | null;
  signal_status?: string | null;
  prob_up?: number | null;
  prob_used?: number | null;
};

export type MarketState = {
  generatedAt: string;
  timeBelgrade: string;

  marketDataTimeUTC?: string;
  marketDataTimeBelgrade?: string;
  forecastHorizon?: string;
  forecastSource?: string;
  source?: string;
  sourceVersion?: string;

  activeRegime: string;
  regimeLabel?: string;
  regimeConfidence?: number;
  confidenceLabel?: string;
  regimeExplanation?: string;
  riskScore?: number;
  regimeNarrative?: RegimeNarrative;

  drivers: MarketDriver[];
  currencyStrength: CurrencyStrengthItem[];
  assets: ApiAsset[];
  model_catalog?: ModelCatalogItem[];
  modelCatalog?: ModelCatalogItem[];

  dataFreshness?: Record<string, unknown>;
  sources?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  errors?: unknown[];
  access?: Record<string, unknown>;
  disclaimer?: string;
};

export type Candle = {
  time_utc: string;
  time_belgrade?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

export type PerformanceSummaryRow = {
  asset: string;
  horizon_h: number;
  evaluated_predictions: number;
  direction_predictions: number;
  direction_hits: number;
  direction_accuracy?: number | null;
  neutral_predictions: number;
  range_predictions: number;
  range_close_hits: number;
  range_close_hit_rate?: number | null;
  range_path_hits?: number;
  range_path_hit_rate?: number | null;
  mu_mae?: number | null;
  median_mu_abs_error?: number | null;
  mean_actual_abs_move?: number | null;
  first_prediction_utc?: string;
  last_prediction_utc?: string;
};

export type PerformanceHistoryRow = {
  asset: string;
  horizon_h: number;
  model_family?: string;
  model_id?: string;
  model_key?: string;
  model_group?: string;

  prediction_time_utc?: string;
  prediction_time_belgrade?: string;
  time_utc?: string;
  time_belgrade?: string;

  bias?: Bias | string;
  pred_dir?: number;

  current_price?: number;
  start_price_used?: number;
  actual_close?: number;

  pred_mu_ret?: number;
  expected_range_ret?: number;
  expected_move_text?: string;
  expected_range_text?: string;

  projected_low?: number;
  projected_high?: number;

  actual_log_return?: number;
  actual_simple_return?: number;
  actual_direction?: number;

  direction_eligible?: boolean;
  direction_hit?: number | null;
  range_close_hit?: number | null;
  range_path_hit?: number | null;

  mu_abs_error?: number | null;
  price_abs_error?: number | null;

  confidence?: number | null;
  confidence_label?: string;
  signal_strength?: string;

  trade_status?: string;
  net_pips?: number | null;
  gross_pips?: number | null;
  exit_reason?: string | null;
  tp1_pips?: number | null;
  tp2_pips?: number | null;
  sl_pips?: number | null;

  evaluation_status?:
    | "evaluated"
    | "pending"
    | string;
};

type MarketStateDatabaseRow = {
  tier: "free" | "pro";
  generated_at: string | null;
  market_data_time_utc: string | null;
  payload: MarketState | string | null;
  source_version: string | null;
};

type PredictionDatabaseRow = {
  asset: string;
  horizon_h: number;
  prediction_time_utc: string;
  model_family: string;
  model_key?: string | null;
  model_id?: string | null;
  tier: "free" | "pro";
  bias: string | null;
  confidence: number | null;
  expected_move_ret: number | null;
  expected_range_ret: number | null;
  projected_low: number | null;
  projected_high: number | null;
  start_price: number | null;
  evaluation_status: string | null;
  actual_close: number | null;
  actual_return: number | null;
  direction_hit: boolean | null;
  range_close_hit: boolean | null;
  range_path_hit: boolean | null;
  mu_abs_error: number | null;
  payload: Record<string, unknown> | string | null;
};

type PerformanceMetricDatabaseRow = Pick<
  PredictionDatabaseRow,
  | "asset"
  | "horizon_h"
  | "prediction_time_utc"
  | "bias"
  | "evaluation_status"
  | "actual_return"
  | "direction_hit"
  | "range_close_hit"
  | "range_path_hit"
  | "mu_abs_error"
>;

export const API_BASE =
  "Supabase cloud · RLS protected";

function asObject(
  value: unknown
): Record<string, any> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function asFiniteNumber(
  value: unknown
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function booleanToHit(
  value: boolean | null | undefined
): number | null {
  if (value === true) {
    return 1;
  }

  if (value === false) {
    return 0;
  }

  return null;
}

function normalizeBias(
  value: unknown
): Bias {
  const text = String(
    value ?? ""
  ).trim().toLowerCase();

  if (
    text === "bullish" ||
    text === "bull" ||
    text === "buy"
  ) {
    return "Bullish";
  }

  if (
    text === "bearish" ||
    text === "bear" ||
    text === "sell"
  ) {
    return "Bearish";
  }

  if (
    text === "range only" ||
    text === "range_only" ||
    text === "range"
  ) {
    return "Range Only";
  }

  return "Neutral";
}

function formatBelgradeTime(
  value?: string | null
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-GB",
    {
      timeZone:
        "Europe/Belgrade",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function mean(
  values: number[]
): number | null {
  if (!values.length) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function median(
  values: number[]
): number | null {
  if (!values.length) {
    return null;
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) => a - b
  );

  const middle = Math.floor(
    sorted.length / 2
  );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      sorted[middle - 1] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}

function firstString(
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return undefined;
}

export async function fetchMarketState(): Promise<MarketState> {
  const {
    data,
    error,
  } = await supabase
    .from("market_state_latest")
    .select(
      [
        "tier",
        "generated_at",
        "market_data_time_utc",
        "payload",
        "source_version",
      ].join(",")
    );

  if (error) {
    throw new Error(
      `Supabase market state error: ${error.message}`
    );
  }

  const rows =
    (data ??
      []) as MarketStateDatabaseRow[];

  const selected =
    rows.find(
      (row) =>
        row.tier === "pro"
    ) ??
    rows.find(
      (row) =>
        row.tier === "free"
    );

  if (!selected) {
    throw new Error(
      "No market-state row is visible for the current account."
    );
  }

  const payload =
    asObject(
      selected.payload
    ) as MarketState;

  const generatedAt =
    firstString(
      payload.generatedAt,
      selected.generated_at
    ) ??
    new Date().toISOString();

  const marketDataTimeUTC =
    firstString(
      payload.marketDataTimeUTC,
      selected.market_data_time_utc
    );

  return {
    ...payload,
    generatedAt,
    timeBelgrade:
      firstString(
        payload.timeBelgrade,
        formatBelgradeTime(
          generatedAt
        )
      ) ??
      generatedAt,
    marketDataTimeUTC,
    marketDataTimeBelgrade:
      firstString(
        payload.marketDataTimeBelgrade,
        formatBelgradeTime(
          marketDataTimeUTC
        )
      ),
    source:
      payload.source ??
      "supabase_market_ai",
    sourceVersion:
      payload.sourceVersion ??
      selected.source_version ??
      undefined,
    activeRegime:
      payload.activeRegime ??
      payload.regimeLabel ??
      "Mixed",
    drivers:
      Array.isArray(
        payload.drivers
      )
        ? payload.drivers
        : [],
    currencyStrength:
      Array.isArray(
        payload.currencyStrength
      )
        ? payload.currencyStrength
        : [],
    assets:
      Array.isArray(
        payload.assets
      )
        ? payload.assets
        : [],
    model_catalog:
      Array.isArray(
        payload.model_catalog
      )
        ? payload.model_catalog
        : Array.isArray(
            payload.modelCatalog
          )
        ? payload.modelCatalog
        : [],
    modelCatalog:
      Array.isArray(
        payload.modelCatalog
      )
        ? payload.modelCatalog
        : Array.isArray(
            payload.model_catalog
          )
        ? payload.model_catalog
        : [],
  };
}

export async function fetchCandles(
  symbol: string,
  limit = 96
): Promise<Candle[]> {
  const normalizedSymbol =
    symbol.toUpperCase();

  const safeLimit = Math.max(
    1,
    Math.min(
      500,
      Math.trunc(limit)
    )
  );

  const {
    data,
    error,
  } = await supabase
    .from("market_candles")
    .select(
      [
        "time_utc",
        "open",
        "high",
        "low",
        "close",
        "volume",
      ].join(",")
    )
    .eq(
      "asset",
      normalizedSymbol
    )
    .order(
      "time_utc",
      {
        ascending: false,
      }
    )
    .limit(safeLimit);

  if (error) {
    throw new Error(
      `Supabase candles error: ${error.message}`
    );
  }

  return (
    (data ?? []) as Candle[]
  ).reverse();
}

function mapPredictionHistoryRow(
  row: PredictionDatabaseRow
): PerformanceHistoryRow {
  const payload =
    asObject(
      row.payload
    );

  const actualReturn =
    asFiniteNumber(
      row.actual_return
    ) ??
    asFiniteNumber(
      payload.actual_log_return
    ) ??
    asFiniteNumber(
      payload.actual_return
    );

  const actualDirection =
    asFiniteNumber(
      payload.actual_direction
    ) ??
    (
      actualReturn === undefined
        ? undefined
        : actualReturn > 0
        ? 1
        : actualReturn < 0
        ? -1
        : 0
    );

  const directionEligible =
    typeof payload.direction_eligible ===
    "boolean"
      ? payload.direction_eligible
      : row.direction_hit !==
        null;

  return {
    asset:
      row.asset.toUpperCase(),
    horizon_h:
      row.horizon_h,
    model_family:
      row.model_family,
    model_id:
      firstString(
        row.model_id,
        payload.model_id
      ),
    model_key:
      firstString(
        row.model_key,
        payload.model_key
      ),
    model_group:
      firstString(
        payload.model_group
      ),

    prediction_time_utc:
      row.prediction_time_utc,
    prediction_time_belgrade:
      firstString(
        payload.prediction_time_belgrade,
        payload.time_belgrade,
        formatBelgradeTime(
          row.prediction_time_utc
        )
      ),
    time_utc:
      firstString(
        payload.time_utc,
        row.prediction_time_utc
      ),
    time_belgrade:
      firstString(
        payload.time_belgrade,
        payload.prediction_time_belgrade
      ),

    bias:
      normalizeBias(
        row.bias ??
        payload.bias
      ),
    pred_dir:
      asFiniteNumber(
        payload.pred_dir
      ),

    current_price:
      asFiniteNumber(
        payload.current_price
      ) ??
      asFiniteNumber(
        payload.currentPrice
      ) ??
      asFiniteNumber(
        row.start_price
      ),
    start_price_used:
      asFiniteNumber(
        payload.start_price_used
      ) ??
      asFiniteNumber(
        row.start_price
      ),
    actual_close:
      asFiniteNumber(
        row.actual_close
      ) ??
      asFiniteNumber(
        payload.actual_close
      ),

    pred_mu_ret:
      asFiniteNumber(
        row.expected_move_ret
      ) ??
      asFiniteNumber(
        payload.pred_mu_ret
      ) ??
      asFiniteNumber(
        payload.pred_mu_12h_ret
      ),
    expected_range_ret:
      asFiniteNumber(
        row.expected_range_ret
      ) ??
      asFiniteNumber(
        payload.expected_range_ret
      ) ??
      asFiniteNumber(
        payload.direct_pred_range_12h_ret
      ),
    expected_move_text:
      firstString(
        payload.expected_move_text,
        payload.expectedMove
      ),
    expected_range_text:
      firstString(
        payload.expected_range_text,
        payload.expectedRange
      ),

    projected_low:
      asFiniteNumber(
        row.projected_low
      ) ??
      asFiniteNumber(
        payload.projected_low
      ) ??
      asFiniteNumber(
        payload.projectedLow
      ),
    projected_high:
      asFiniteNumber(
        row.projected_high
      ) ??
      asFiniteNumber(
        payload.projected_high
      ) ??
      asFiniteNumber(
        payload.projectedHigh
      ),

    actual_log_return:
      actualReturn,
    actual_simple_return:
      asFiniteNumber(
        payload.actual_simple_return
      ),
    actual_direction:
      actualDirection,

    direction_eligible:
      directionEligible,
    direction_hit:
      booleanToHit(
        row.direction_hit
      ),
    range_close_hit:
      booleanToHit(
        row.range_close_hit
      ),
    range_path_hit:
      booleanToHit(
        row.range_path_hit
      ),

    mu_abs_error:
      asFiniteNumber(
        row.mu_abs_error
      ) ??
      asFiniteNumber(
        payload.mu_abs_error
      ),
    price_abs_error:
      asFiniteNumber(
        payload.price_abs_error
      ),

    confidence:
      asFiniteNumber(
        row.confidence
      ) ??
      asFiniteNumber(
        payload.confidence
      ),
    confidence_label:
      firstString(
        payload.confidence_label
      ),
    signal_strength:
      firstString(
        payload.signal_strength
      ),

    trade_status:
      firstString(
        payload.trade_status,
        payload.status
      ),
    net_pips:
      asFiniteNumber(
        payload.net_pips
      ),
    gross_pips:
      asFiniteNumber(
        payload.gross_pips
      ),
    exit_reason:
      firstString(
        payload.exit_reason
      ),
    tp1_pips:
      asFiniteNumber(
        payload.tp1_pips
      ),
    tp2_pips:
      asFiniteNumber(
        payload.tp2_pips
      ),
    sl_pips:
      asFiniteNumber(
        payload.sl_pips
      ),

    evaluation_status:
      firstString(
        row.evaluation_status,
        payload.evaluation_status
      ) ??
      "pending",
  };
}

export async function fetchPerformanceHistory(
  asset: string,
  horizonH: number,
  limit = 100,
  modelFamily?: string,
  modelKey?: string,
  modelId?: string
): Promise<PerformanceHistoryRow[]> {
  const normalizedAsset =
    asset.toUpperCase();

  const safeLimit = Math.max(
    1,
    Math.min(
      500,
      Math.trunc(limit)
    )
  );

  let query = supabase
    .from("predictions")
    .select(
      [
        "asset",
        "horizon_h",
        "prediction_time_utc",
        "model_family",
        "model_key",
        "model_id",
        "tier",
        "bias",
        "confidence",
        "expected_move_ret",
        "expected_range_ret",
        "projected_low",
        "projected_high",
        "start_price",
        "evaluation_status",
        "actual_close",
        "actual_return",
        "direction_hit",
        "range_close_hit",
        "range_path_hit",
        "mu_abs_error",
        "payload",
      ].join(",")
    )
    .eq(
      "asset",
      normalizedAsset
    )
    .eq(
      "horizon_h",
      horizonH
    );

  if (modelFamily) {
    query = query.eq(
      "model_family",
      modelFamily
    );
  }

  if (modelKey) {
    query = query.eq(
      "model_key",
      modelKey
    );
  }

  if (modelId) {
    query = query.eq(
      "model_id",
      modelId
    );
  }

  const {
    data,
    error,
  } = await query
    .order(
      "prediction_time_utc",
      {
        ascending: false,
      }
    )
    .limit(safeLimit);

  if (error) {
    throw new Error(
      `Supabase prediction history error: ${error.message}`
    );
  }

  return (
    (data ??
      []) as PredictionDatabaseRow[]
  ).map(
    mapPredictionHistoryRow
  );
}

export async function fetchPerformanceSummary(
  asset?: string,
  horizonH?: number
): Promise<PerformanceSummaryRow[]> {
  let query = supabase
    .from("predictions")
    .select(
      [
        "asset",
        "horizon_h",
        "prediction_time_utc",
        "bias",
        "evaluation_status",
        "actual_return",
        "direction_hit",
        "range_close_hit",
        "range_path_hit",
        "mu_abs_error",
      ].join(",")
    )
    .order(
      "prediction_time_utc",
      {
        ascending: true,
      }
    )
    .limit(5000);

  if (asset) {
    query = query.eq(
      "asset",
      asset.toUpperCase()
    );
  }

  if (
    typeof horizonH ===
    "number"
  ) {
    query = query.eq(
      "horizon_h",
      horizonH
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Supabase performance summary error: ${error.message}`
    );
  }

  const grouped = new Map<
    string,
    PerformanceMetricDatabaseRow[]
  >();

  for (
    const row of
      (data ??
        []) as PerformanceMetricDatabaseRow[]
  ) {
    const key =
      `${row.asset.toUpperCase()}-${row.horizon_h}`;

    const group =
      grouped.get(key) ?? [];

    group.push(row);
    grouped.set(
      key,
      group
    );
  }

  const summaries: PerformanceSummaryRow[] =
    [];

  for (
    const [
      ,
      rows,
    ] of grouped
  ) {
    const evaluated =
      rows.filter(
        (row) =>
          row.evaluation_status ===
          "evaluated"
      );

    if (!evaluated.length) {
      continue;
    }

    const directionRows =
      evaluated.filter(
        (row) =>
          row.direction_hit !==
          null
      );

    const rangeCloseRows =
      evaluated.filter(
        (row) =>
          row.range_close_hit !==
          null
      );

    const rangePathRows =
      evaluated.filter(
        (row) =>
          row.range_path_hit !==
          null
      );

    const muErrors =
      evaluated
        .map(
          (row) =>
            asFiniteNumber(
              row.mu_abs_error
            )
        )
        .filter(
          (
            value
          ): value is number =>
            value !== undefined
        );

    const actualMoves =
      evaluated
        .map(
          (row) =>
            asFiniteNumber(
              row.actual_return
            )
        )
        .filter(
          (
            value
          ): value is number =>
            value !== undefined
        )
        .map(
          (value) =>
            Math.abs(value)
        );

    const directionHits =
      directionRows.filter(
        (row) =>
          row.direction_hit ===
          true
      ).length;

    const rangeCloseHits =
      rangeCloseRows.filter(
        (row) =>
          row.range_close_hit ===
          true
      ).length;

    const rangePathHits =
      rangePathRows.filter(
        (row) =>
          row.range_path_hit ===
          true
      ).length;

    const sortedTimes =
      evaluated
        .map(
          (row) =>
            row.prediction_time_utc
        )
        .filter(Boolean)
        .sort();

    summaries.push({
      asset:
        evaluated[0].asset.toUpperCase(),
      horizon_h:
        evaluated[0].horizon_h,
      evaluated_predictions:
        evaluated.length,
      direction_predictions:
        directionRows.length,
      direction_hits:
        directionHits,
      direction_accuracy:
        directionRows.length
          ? directionHits /
            directionRows.length
          : null,
      neutral_predictions:
        evaluated.length -
        directionRows.length,
      range_predictions:
        rangeCloseRows.length,
      range_close_hits:
        rangeCloseHits,
      range_close_hit_rate:
        rangeCloseRows.length
          ? rangeCloseHits /
            rangeCloseRows.length
          : null,
      range_path_hits:
        rangePathHits,
      range_path_hit_rate:
        rangePathRows.length
          ? rangePathHits /
            rangePathRows.length
          : null,
      mu_mae:
        mean(muErrors),
      median_mu_abs_error:
        median(muErrors),
      mean_actual_abs_move:
        mean(actualMoves),
      first_prediction_utc:
        sortedTimes[0],
      last_prediction_utc:
        sortedTimes[
          sortedTimes.length - 1
        ],
    });
  }

  return summaries.sort(
    (a, b) => {
      const assetCompare =
        a.asset.localeCompare(
          b.asset
        );

      if (assetCompare !== 0) {
        return assetCompare;
      }

      return (
        a.horizon_h -
        b.horizon_h
      );
    }
  );
}

export function getAssetSymbol(
  asset: ApiAsset
) {
  return String(
    asset.symbol ??
    asset.asset
  ).toUpperCase();
}

export function getAssetKey(
  asset: ApiAsset
) {
  return `${getAssetSymbol(
    asset
  )}-${asset.horizon_h ?? 12}`;
}