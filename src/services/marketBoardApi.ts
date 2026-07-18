import { supabase } from "../lib/supabase";

export type ApiAsset = {
  asset: string;
  symbol?: string;
  display?: string;
  horizon_h?: number;
  source?: string;
  model_family?: string;
  model_id?: string;
  model_key?: string;
  model_group?: string;
  bias?: string;
  confidence?: number | null;
  currentPrice?: number | null;
  close?: number | null;
  expectedMove?: string | null;
  expectedRange?: string | null;
  prob_up?: number | null;
  prob_down?: number | null;
  projectedLow?: number | null;
  projectedHigh?: number | null;
  status?: string | null;
  signal_status?: string | null;
  model_status?: string | null;
  live_direction_n?: number | null;
  live_direction_accuracy?: number | null;
  live_range_path_n?: number | null;
  live_range_path_accuracy?: number | null;
  [key: string]: unknown;
};

export type Candle = {
  time_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

export type MarketDriver = {
  key: string;
  title: string;
  state: string;
  detail: string;
};

export type CurrencyStrengthItem = {
  code: string;
  score: number;
  bias: string;
};

export type MarketState = {
  generatedAt: string;
  marketDataTimeUTC?: string;
  activeRegime: string;
  regimeExplanation?: string;
  assets: ApiAsset[];
  drivers: MarketDriver[];
  currencyStrength: CurrencyStrengthItem[];
};

type MarketStateRow = {
  tier: "free" | "pro";
  generated_at: string | null;
  market_data_time_utc: string | null;
  payload: unknown;
};

function asObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function fetchMarketState(): Promise<MarketState> {
  const { data, error } = await supabase
    .from("market_state_latest")
    .select("tier,generated_at,market_data_time_utc,payload");

  if (error) {
    throw new Error(`Supabase market state error: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as MarketStateRow[];
  const selected = rows.find((row) => row.tier === "pro") ?? rows.find((row) => row.tier === "free");
  if (!selected) {
    throw new Error("No market-state row is visible for the current account.");
  }

  const payload = asObject(selected.payload);
  return {
    generatedAt: String(payload.generatedAt ?? selected.generated_at ?? new Date().toISOString()),
    marketDataTimeUTC: String(payload.marketDataTimeUTC ?? selected.market_data_time_utc ?? "") || undefined,
    activeRegime: String(payload.activeRegime ?? payload.regimeLabel ?? "Mixed"),
    regimeExplanation:
      typeof payload.regimeExplanation === "string" ? payload.regimeExplanation : undefined,
    assets: Array.isArray(payload.assets) ? (payload.assets as ApiAsset[]) : [],
    drivers: Array.isArray(payload.drivers) ? (payload.drivers as MarketDriver[]) : [],
    currencyStrength: Array.isArray(payload.currencyStrength)
      ? (payload.currencyStrength as CurrencyStrengthItem[])
      : [],
  };
}

export async function fetchCandles(symbol: string, limit = 96): Promise<Candle[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("market_candles")
    .select("time_utc,open,high,low,close,volume")
    .eq("asset", symbol.toUpperCase())
    .order("time_utc", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Supabase candles error: ${error.message}`);
  }

  return ((data ?? []) as unknown as Candle[]).reverse();
}

export const API_BASE = "Supabase cloud · RLS protected";
