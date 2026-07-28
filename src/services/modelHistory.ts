import { supabase } from "../lib/supabase";
import {
  type ModelDefinition,
  modelSlug,
} from "../config/modelCatalog";
import { BUNDLED_FREE_MODEL_HISTORY } from "../data/freeModelHistory";

export type ExtendedHistoryRow = {
  asset: string;
  horizonH: number;
  modelKey: string;
  modelId?: string;
  modelFamily?: string;
  predictionTimeUtc: string;
  bias: string;
  startPrice?: number | null;
  actualClose?: number | null;
  actualReturn?: number | null;
  directionHit?: boolean | null;
  rangeCloseHit?: boolean | null;
  rangePathHit?: boolean | null;
  evaluationStatus: string;
  confidence?: number | null;
  netPips?: number | null;
  grossPips?: number | null;
  forecastResult?: string | null;
  tradeResult?: string | null;
  tradeNetPips?: number | null;
  mfePips?: number | null;
  maePips?: number | null;
  partialProfitHit?: boolean | null;
  breakevenArmed?: boolean | null;
  runnerExitReason?: string | null;
  isNonOverlapping: boolean;
  payload: Record<string, any>;
};

const HISTORY_COLUMNS = [
  "asset",
  "horizon_h",
  "prediction_time_utc",
  "model_family",
  "model_key",
  "model_id",
  "bias",
  "confidence",
  "start_price",
  "evaluation_status",
  "actual_close",
  "actual_return",
  "direction_hit",
  "range_close_hit",
  "range_path_hit",
  "payload",
].join(",");

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

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  return null;
}

function rowKey(row: any) {
  return modelSlug(
    row.model_key ??
      row.model_id ??
      row.payload?.model_key ??
      row.payload?.model_id ??
      row.model_family
  );
}

function mapRemoteRows(
  rawRows: any[],
  model: ModelDefinition
): ExtendedHistoryRow[] {
  const aliases = new Set(
    [model.modelKey, ...(model.aliases ?? [])].map(modelSlug)
  );

  return rawRows
    .map((raw: any) => {
      const payload = asObject(raw.payload);
      const modelKey = rowKey({ ...raw, payload });
      const bias = String(raw.bias ?? payload.bias ?? "Neutral");

      return {
        asset: String(raw.asset ?? model.asset).toUpperCase(),
        horizonH: Number(raw.horizon_h ?? model.horizonH),
        modelKey,
        modelId: raw.model_id ?? payload.model_id,
        modelFamily: raw.model_family ?? payload.model_family,
        predictionTimeUtc: String(
          raw.prediction_time_utc ??
            payload.prediction_time_utc ??
            payload.time_utc ??
            ""
        ),
        bias,
        startPrice: asNumber(
          raw.start_price ?? payload.start_price_used ?? payload.current_price ?? payload.currentPrice
        ),
        actualClose: asNumber(raw.actual_close ?? payload.actual_close),
        actualReturn: asNumber(raw.actual_return ?? payload.actual_log_return),
        directionHit: asBoolean(raw.direction_hit ?? payload.direction_hit),
        rangeCloseHit: asBoolean(raw.range_close_hit ?? payload.range_close_hit),
        rangePathHit: asBoolean(raw.range_path_hit ?? payload.range_path_hit),
        evaluationStatus: String(
          raw.evaluation_status ?? payload.evaluation_status ?? "pending"
        ),
        confidence: asNumber(
          raw.confidence ?? payload.confidence ?? payload.threshold_confidence
        ),
        netPips: asNumber(payload.signed_pips ?? payload.net_pips),
        grossPips: asNumber(payload.gross_pips),
        forecastResult: firstString(
          payload.terminal_forecast_result,
          payload.forecast_result,
          payload.direction_result
        ),
        tradeResult: firstString(
          payload.trade_result_label,
          payload.trade_result,
          payload.trade_outcome
        ),
        tradeNetPips: asNumber(
          payload.trade_net_pips ?? payload.realized_trade_pips ?? payload.net_trade_pips
        ),
        mfePips: asNumber(
          payload.mfe_pips ?? payload.maximum_favorable_excursion_pips
        ),
        maePips: asNumber(
          payload.mae_pips ?? payload.maximum_adverse_excursion_pips
        ),
        partialProfitHit: asBoolean(
          payload.partial_profit_hit ?? payload.half_profit_hit
        ),
        breakevenArmed: asBoolean(
          payload.breakeven_armed ?? payload.be_armed
        ),
        runnerExitReason: firstString(
          payload.runner_exit_reason,
          payload.exit_reason
        ),
        isNonOverlapping: Boolean(
          payload.is_non_overlapping ?? payload.non_overlapping ?? false
        ),
        payload,
      } satisfies ExtendedHistoryRow;
    })
    .filter((row) => aliases.has(row.modelKey))
    .filter((row) => !String(row.bias).toLowerCase().includes("neutral"))
    .filter((row) => row.payload.production_signal !== false)
    .filter((row) => row.payload.publish_prediction !== false);
}

function mergeHistoryRows(
  remoteRows: ExtendedHistoryRow[],
  bundledRows: ExtendedHistoryRow[],
  safeLimit: number
): ExtendedHistoryRow[] {
  const merged = new Map<string, ExtendedHistoryRow>();

  for (const row of [...bundledRows, ...remoteRows]) {
    if (String(row.bias).toLowerCase().includes("neutral")) continue;
    const key = [row.modelKey, row.predictionTimeUtc].join("|");
    merged.set(key, row);
  }

  return [...merged.values()]
    .sort((left, right) =>
      right.predictionTimeUtc.localeCompare(left.predictionTimeUtc)
    )
    .slice(0, safeLimit);
}

export async function fetchExactModelHistory(
  model: ModelDefinition,
  limit = 200
): Promise<ExtendedHistoryRow[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const bundledRows = BUNDLED_FREE_MODEL_HISTORY[model.modelKey] ?? [];

  const { data, error } = await supabase
    .from("predictions")
    .select(HISTORY_COLUMNS)
    .eq("asset", model.asset)
    .eq("horizon_h", model.horizonH)
    .order("prediction_time_utc", { ascending: false })
    .limit(Math.min(500, safeLimit * 6));

  const remoteRows = error ? [] : mapRemoteRows(data ?? [], model);
  const rows = mergeHistoryRows(remoteRows, bundledRows, safeLimit);

  if (rows.length) return rows;

  if (error && model.tier !== "Free") {
    throw new Error(`Supabase model history error: ${error.message}`);
  }

  return [];
}
