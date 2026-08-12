import { supabase } from "../lib/supabase";

export type XauBotSide = 1 | -1;
export type XauBotTimeframe = "M15" | "H1";

export type XauBotTrade = {
  trade_id: string;
  bot_id: string;
  status: "OPEN" | "CLOSED" | string;
  side: XauBotSide;
  direction: "BUY" | "SELL" | string;
  opened_at: string;
  closed_at?: string | null;
  entry_price: number;
  sl_price: number;
  tp_price: number;
  exit_price?: number | null;
  gross_r?: number | null;
  net_r?: number | null;
  gross_pips?: number | null;
  net_pips?: number | null;
  exit_reason?: string | null;
  payload?: Record<string, any> | null;
};

export type XauBotMetrics = {
  bot_id?: string;
  generated_at_utc?: string;
  closed_trades?: number;
  wins?: number;
  losses?: number;
  win_rate?: number | null;
  net_r?: number;
  avg_r?: number | null;
  profit_factor?: number | null;
  total_pips?: number;
  avg_pips?: number | null;
  max_drawdown_r?: number;
  active_trade?: boolean;
  unrealized_r?: number | null;
  unrealized_pips?: number | null;
};

export type XauBotStatePayload = {
  bot_id: string;
  generated_at_utc?: string;
  mode?: string;
  policy_id?: string;
  status: string;
  current_price?: number | null;
  opportunity?: {
    decision_time_utc?: string;
    opp_score?: number;
    top15_threshold?: number;
    high_opportunity?: boolean;
    status?: string;
    ready?: boolean;
    reason?: string;
  } | null;
  range_top?: number | null;
  range_bottom?: number | null;
  armed_until_utc?: string | null;
  f1?: {
    side?: XauBotSide;
    confirm_close_time_utc?: string;
  } | null;
  cross_asset?: {
    confirmed?: boolean;
    confirm_close_time_utc?: string;
    label?: string;
    compatible_regimes?: string[];
    states?: Record<string, number | string | null>;
  } | null;
  active_trade?: Record<string, any> | null;
  last_closed_trade?: Record<string, any> | null;
  metrics?: XauBotMetrics | null;
  notice?: string;
};

export type XauBotCandle = {
  asset: string;
  timeframe: XauBotTimeframe;
  time_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  spread_points?: number | null;
  source?: string | null;
};

const BOT_ID = "xauusd-shadow-v1";

function asObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export async function fetchXauBotState(): Promise<XauBotStatePayload | null> {
  const { data, error } = await supabase
    .from("xau_bot_state")
    .select("bot_id,updated_at,status,current_price,active_trade_id,payload")
    .eq("bot_id", BOT_ID)
    .maybeSingle();

  if (error) throw new Error(`XAU bot state error: ${error.message}`);
  if (!data) return null;

  const payload = asObject((data as any).payload);
  return {
    bot_id: String((data as any).bot_id ?? BOT_ID),
    status: String(payload.status ?? (data as any).status ?? "UNKNOWN"),
    current_price:
      typeof payload.current_price === "number"
        ? payload.current_price
        : (data as any).current_price,
    ...payload,
  } as XauBotStatePayload;
}

export async function fetchXauBotMetrics(): Promise<XauBotMetrics | null> {
  const { data, error } = await supabase
    .from("xau_bot_metrics")
    .select("bot_id,updated_at,payload")
    .eq("bot_id", BOT_ID)
    .maybeSingle();

  if (error) throw new Error(`XAU bot metrics error: ${error.message}`);
  if (!data) return null;
  return asObject((data as any).payload) as XauBotMetrics;
}

export async function fetchXauBotTrades(limit = 100): Promise<XauBotTrade[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("xau_bot_trades")
    .select(
      "trade_id,bot_id,status,side,direction,opened_at,closed_at,entry_price,sl_price,tp_price,exit_price,gross_r,net_r,gross_pips,net_pips,exit_reason,payload"
    )
    .eq("bot_id", BOT_ID)
    .order("opened_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`XAU bot trades error: ${error.message}`);
  return (data ?? []) as XauBotTrade[];
}

export async function fetchXauBotCandles(
  timeframe: XauBotTimeframe,
  limit = 120
): Promise<XauBotCandle[]> {
  const safeLimit = Math.max(20, Math.min(500, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("xau_bot_candles")
    .select("asset,timeframe,time_utc,open,high,low,close,volume,spread_points,source")
    .eq("asset", "XAUUSD")
    .eq("timeframe", timeframe)
    .order("time_utc", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`XAU bot candles error: ${error.message}`);
  return ((data ?? []) as XauBotCandle[]).reverse();
}
