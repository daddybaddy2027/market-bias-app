export type Bias = "Bullish" | "Bearish" | "Neutral" | "Range Only";

export type MarketDriver = {
  key: string;
  title: string;
  state: string;
  score?: number;
  strength: number;
  detail: string;
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
};

export type MarketState = {
  generatedAt: string;
  timeBelgrade: string;

  marketDataTimeUTC?: string;
  marketDataTimeBelgrade?: string;
  forecastHorizon?: string;
  forecastSource?: string;
  source?: string;

  activeRegime: string;
  regimeLabel?: string;
  regimeConfidence?: number;
  confidenceLabel?: string;
  regimeExplanation?: string;
  riskScore?: number;

  drivers: MarketDriver[];
  currencyStrength: CurrencyStrengthItem[];
  assets: ApiAsset[];

  dataFreshness?: Record<string, unknown>;
  sources?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  errors?: unknown[];
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

  evaluation_status?: "evaluated" | "pending" | string;
};

const DEV_PC_IP = "127.0.0.1";

export const API_BASE =
  "https://generators-raising-inquiries-making.trycloudflare.com";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `API error ${response.status}: ${path}${body ? ` · ${body}` : ""}`
    );
  }

  return response.json();
}

export async function fetchMarketState(): Promise<MarketState> {
  return apiGet<MarketState>("/api/market-state/latest");
}

export async function fetchCandles(
  symbol: string,
  limit = 96
): Promise<Candle[]> {
  const data = await apiGet<{ count: number; rows: Candle[] }>(
    `/api/candles/${symbol}?limit=${limit}`
  );
  return data.rows ?? [];
}

export async function fetchPerformanceSummary(
  asset?: string,
  horizonH?: number
): Promise<PerformanceSummaryRow[]> {
  const params = new URLSearchParams();
  if (asset) params.set("asset", asset);
  if (horizonH) params.set("horizon_h", String(horizonH));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await apiGet<{ count: number; rows: PerformanceSummaryRow[] }>(
    `/api/performance/summary${suffix}`
  );
  return data.rows ?? [];
}

export async function fetchPerformanceHistory(
  asset: string,
  horizonH: number,
  limit = 100
): Promise<PerformanceHistoryRow[]> {
  const params = new URLSearchParams({
    asset,
    horizon_h: String(horizonH),
    limit: String(limit),
  });

  const data = await apiGet<{ count: number; rows: PerformanceHistoryRow[] }>(
    `/api/performance/history?${params.toString()}`
  );
  return data.rows ?? [];
}

export function getAssetSymbol(asset: ApiAsset) {
  return String(asset.symbol ?? asset.asset).toUpperCase();
}

export function getAssetKey(asset: ApiAsset) {
  return `${getAssetSymbol(asset)}-${asset.horizon_h ?? 12}`;
}