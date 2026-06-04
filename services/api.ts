export type Bias = "Bullish" | "Bearish" | "Neutral";

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
  note: string;
};

export type ApiAsset = {
  source?: string;
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
  expectedMove?: string;
  expectedRange?: string;
  currentPrice?: number;
  projectedLow?: number;
  projectedHigh?: number;
  confidence: number;
  signal_strength?: string;
  expert_top?: string;
  expert_profile?: string;
  model_status?: string;
  visible?: boolean;
  status?: string;
  drivers?: string[];
  explanation?: string;
};

export type MarketState = {
  generatedAt: string;
  timeBelgrade: string;
  marketDataTimeUTC?: string;
  marketDataTimeBelgrade?: string;
  forecastHorizon: string;

  activeRegime: string;
  regimeLabel?: string;
  regimeConfidence: number;
  confidenceLabel?: string;
  regimeExplanation?: string;
  riskScore: number;

  drivers: MarketDriver[];
  currencyStrength: CurrencyStrengthItem[];
  assets: ApiAsset[];

  dataFreshness?: Record<string, any>;
  sources?: Record<string, any>;
  disclaimer?: string;
};

export type PredictionHistoryRow = {
  time_belgrade?: string;
  time_utc?: string;
  asset: string;
  close?: number;
  bias?: Bias | string;
  pred_mu_12h_ret?: number;
  direct_pred_range_12h_ret?: number;
  confidence?: number;
  signal_strength?: string;
  expert_top?: string;
  expert_profile?: string;
};

const DEV_PC_IP = "127.0.0.1";

// Ako testirate na telefonu preko Expo Go, ovde stavite IPv4 računara.
// Primer: const DEV_PC_IP = "192.168.1.15";
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${DEV_PC_IP}:8000`;

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json();
}

export async function fetchMarketState(): Promise<MarketState> {
  return apiGet<MarketState>("/api/market-state/latest");
}

export async function fetchPredictionHistory(limit = 200): Promise<PredictionHistoryRow[]> {
  const data = await apiGet<{ count: number; rows: PredictionHistoryRow[] }>(
    `/api/predictions/history?limit=${limit}`
  );

  return data.rows ?? [];
}

export function getAssetSymbol(asset: ApiAsset) {
  return asset.symbol ?? asset.asset;
}