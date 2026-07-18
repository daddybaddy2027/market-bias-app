import { supabase } from "../lib/supabase";
import {
  type ModelDefinition,
  modelSlug,
} from "../config/modelCatalog";

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
  isNonOverlapping: boolean;
  payload: Record<string, any>;
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

function rowKey(row: any) {
  return modelSlug(
    row.model_key ??
      row.model_id ??
      row.payload?.model_key ??
      row.payload?.model_id ??
      row.model_family
  );
}

export async function fetchExactModelHistory(
  model: ModelDefinition,
  limit = 200
): Promise<ExtendedHistoryRow[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const aliases = new Set(
    [model.modelKey, ...(model.aliases ?? [])].map(modelSlug)
  );

  const { data, error } = await supabase
    .from("predictions")
    .select(
      [
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
      ].join(",")
    )
    .eq("asset", model.asset)
    .eq("horizon_h", model.horizonH)
    .order("prediction_time_utc", { ascending: false })
    .limit(Math.min(500, safeLimit * 4));

  if (error) {
    throw new Error(`Supabase model history error: ${error.message}`);
  }

  return (data ?? [])
    .map((raw: any) => {
      const payload = asObject(raw.payload);
      return {
        asset: String(raw.asset ?? model.asset).toUpperCase(),
        horizonH: Number(raw.horizon_h ?? model.horizonH),
        modelKey: rowKey({ ...raw, payload }),
        modelId: raw.model_id ?? payload.model_id,
        modelFamily: raw.model_family ?? payload.model_family,
        predictionTimeUtc: String(
          raw.prediction_time_utc ?? payload.prediction_time_utc ?? payload.time_utc ?? ""
        ),
        bias: String(raw.bias ?? payload.bias ?? "Neutral"),
        startPrice: asNumber(raw.start_price ?? payload.start_price_used ?? payload.current_price),
        actualClose: asNumber(raw.actual_close ?? payload.actual_close),
        actualReturn: asNumber(raw.actual_return ?? payload.actual_log_return),
        directionHit: asBoolean(raw.direction_hit ?? payload.direction_hit),
        rangeCloseHit: asBoolean(raw.range_close_hit ?? payload.range_close_hit),
        rangePathHit: asBoolean(raw.range_path_hit ?? payload.range_path_hit),
        evaluationStatus: String(
          raw.evaluation_status ?? payload.evaluation_status ?? "pending"
        ),
        confidence: asNumber(raw.confidence ?? payload.confidence),
        netPips: asNumber(payload.net_pips ?? payload.signed_pips),
        grossPips: asNumber(payload.gross_pips),
        isNonOverlapping: Boolean(
          payload.is_non_overlapping ?? payload.non_overlapping ?? false
        ),
        payload,
      } satisfies ExtendedHistoryRow;
    })
    .filter((row) => aliases.has(row.modelKey))
    .slice(0, safeLimit);
}
