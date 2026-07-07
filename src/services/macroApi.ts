import { supabase } from "../lib/supabase";

export type MacroCategory =
  | "inflation"
  | "labor_market"
  | "inflation_expectations"
  | "treasury_yields"
  | string;

export type MacroSeriesPoint = {
  indicator_key: string;
  indicator_label: string;
  category: MacroCategory;
  source?: string | null;
  source_table?: string | null;
  source_column?: string | null;
  date: string;
  value: number;
  previous_value?: number | null;
  delta?: number | null;
  delta_pct?: number | null;
  unit?: string | null;
  frequency?: string | null;
  importance?: number | null;
  interpretation?: string | null;
  interpretation_label?: string | null;
  bias_for_usd?: string | null;
  hotter_cooler?: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapMacroRow(row: any): MacroSeriesPoint {
  return {
    indicator_key: String(row.indicator_key),
    indicator_label: String(row.indicator_label),
    category: String(row.category),
    source: row.source ?? null,
    source_table: row.source_table ?? null,
    source_column: row.source_column ?? null,
    date: String(row.date),
    value: asNumber(row.value) ?? 0,
    previous_value: asNumber(row.previous_value),
    delta: asNumber(row.delta),
    delta_pct: asNumber(row.delta_pct),
    unit: row.unit ?? null,
    frequency: row.frequency ?? null,
    importance: asNumber(row.importance),
    interpretation: row.interpretation ?? null,
    interpretation_label: row.interpretation_label ?? null,
    bias_for_usd: row.bias_for_usd ?? null,
    hotter_cooler: row.hotter_cooler ?? null,
  };
}

export async function fetchMacroSeries(options?: {
  category?: string;
  indicatorKey?: string;
  limit?: number;
}): Promise<MacroSeriesPoint[]> {
  const safeLimit = Math.max(
    1,
    Math.min(5000, Math.trunc(options?.limit ?? 2000))
  );

  let query = supabase
    .from("macro_series")
    .select(
      [
        "indicator_key",
        "indicator_label",
        "category",
        "source",
        "source_table",
        "source_column",
        "date",
        "value",
        "previous_value",
        "delta",
        "delta_pct",
        "unit",
        "frequency",
        "importance",
        "interpretation",
        "interpretation_label",
        "bias_for_usd",
        "hotter_cooler",
      ].join(",")
    )
    .order("date", { ascending: true })
    .limit(safeLimit);

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.indicatorKey) {
    query = query.eq("indicator_key", options.indicatorKey);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase macro series error: ${error.message}`);
  }

  return (data ?? []).map(mapMacroRow);
}

export async function fetchMacroLatest(limit = 40): Promise<MacroSeriesPoint[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));

  const { data, error } = await supabase
    .from("macro_series")
    .select(
      [
        "indicator_key",
        "indicator_label",
        "category",
        "source",
        "source_table",
        "source_column",
        "date",
        "value",
        "previous_value",
        "delta",
        "delta_pct",
        "unit",
        "frequency",
        "importance",
        "interpretation",
        "interpretation_label",
        "bias_for_usd",
        "hotter_cooler",
      ].join(",")
    )
    .order("importance", { ascending: false })
    .order("date", { ascending: false })
    .limit(safeLimit * 4);

  if (error) {
    throw new Error(`Supabase macro latest error: ${error.message}`);
  }

  const rows = (data ?? []).map(mapMacroRow);
  const seen = new Set<string>();
  const latest: MacroSeriesPoint[] = [];

  for (const row of rows) {
    if (seen.has(row.indicator_key)) {
      continue;
    }

    seen.add(row.indicator_key);
    latest.push(row);

    if (latest.length >= safeLimit) {
      break;
    }
  }

  return latest;
}