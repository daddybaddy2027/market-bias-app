import { supabase } from "../lib/supabase";

export type XauBotTimeframe = "M15" | "H1";

export type XauBotState = {
  id: string;
  updated_at: string;
  status: string;
  mode: string;
  starting_balance_usd: number;
  balance_usd: number;
  equity_usd: number;
  realized_pnl_usd: number;
  open_pnl_usd: number;
  total_pips: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  profit_factor: number | null;
  max_drawdown_usd: number;
  max_drawdown_pct: number;
  best_trade_usd: number | null;
  worst_trade_usd: number | null;
  open_positions: number;
  max_open_positions: number;
  current_price: number | null;
  h1_regime: string | null;
  prediction_side: string | null;
  prediction_confidence: number | null;
  pending_route: string | null;
  next_decision_at: string | null;
  source_version: string | null;
  payload?: Record<string, unknown> | null;
};

export type XauBotTrade = {
  trade_id: string;
  move_id: string | null;
  prediction_time: string | null;
  trigger_time: string | null;
  entry_time: string;
  exit_time: string | null;
  side: number;
  route: string;
  status: string;
  entry_price: number;
  sl_price: number;
  tp_price: number;
  be_price: number | null;
  exit_price: number | null;
  lot_size: number;
  initial_risk_usd: number | null;
  r_result: number | null;
  pnl_usd: number | null;
  pips: number | null;
  exit_reason: string | null;
  payload?: Record<string, unknown> | null;
};

export type XauBotEquityPoint = {
  time_utc: string;
  balance_usd: number;
  equity_usd: number;
  realized_pnl_usd: number;
  open_pnl_usd: number;
  drawdown_usd: number;
  drawdown_pct: number;
};

export type XauBotCandle = {
  timeframe: XauBotTimeframe;
  time_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type XauBotSnapshot = {
  state: XauBotState;
  trades: XauBotTrade[];
  equity: XauBotEquityPoint[];
  candles: XauBotCandle[];
};

export async function fetchXauBotState(): Promise<XauBotState> {
  const { data, error } = await supabase
    .from("xau_bot_state")
    .select("*")
    .eq("id", "live")
    .maybeSingle();

  if (error) throw new Error(`XAU bot state: ${error.message}`);
  if (!data) throw new Error("XAU bot state: no data");
  return data as XauBotState;
}

export async function fetchXauBotTrades(limit = 100): Promise<XauBotTrade[]> {
  const safeLimit = Math.max(1, Math.min(300, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("xau_bot_trades")
    .select("*")
    .order("entry_time", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`XAU bot trades: ${error.message}`);
  return (data ?? []) as XauBotTrade[];
}

export async function fetchXauBotEquity(limit = 400): Promise<XauBotEquityPoint[]> {
  const safeLimit = Math.max(1, Math.min(1000, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("xau_bot_equity")
    .select("*")
    .order("time_utc", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`XAU bot equity: ${error.message}`);
  return ((data ?? []) as XauBotEquityPoint[]).reverse();
}

export async function fetchXauBotCandles(
  timeframe: XauBotTimeframe,
  limit = 120
): Promise<XauBotCandle[]> {
  const safeLimit = Math.max(20, Math.min(300, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("xau_bot_candles")
    .select("timeframe,time_utc,open,high,low,close,volume")
    .eq("timeframe", timeframe)
    .order("time_utc", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`XAU bot candles: ${error.message}`);
  return ((data ?? []) as XauBotCandle[]).reverse();
}

export async function fetchXauBotSnapshot(
  timeframe: XauBotTimeframe
): Promise<XauBotSnapshot> {
  const [state, trades, equity, candles] = await Promise.all([
    fetchXauBotState(),
    fetchXauBotTrades(120),
    fetchXauBotEquity(500),
    fetchXauBotCandles(timeframe, timeframe === "M15" ? 140 : 120),
  ]);

  return { state, trades, equity, candles };
}
