import React from "react";
import { Pressable, Text, View } from "react-native";

import type { ModelDefinition } from "../../config/modelCatalog";
import type { ExtendedHistoryRow } from "../../services/modelHistory";
import { Card, Metric } from "../dashboard/DashboardPrimitives";

function price(value?: number | null, asset = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (asset.includes("JPY")) return value.toFixed(3);
  if (asset === "XAUUSD") return value.toFixed(2);
  return value.toFixed(5);
}

function signed(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pips`;
}

function dateTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function biasClass(value?: string | null) {
  const text = String(value ?? "Neutral").toLowerCase();
  if (text.includes("bull")) return "text-emerald-300";
  if (text.includes("bear")) return "text-red-300";
  return "text-sky-300";
}

function forecastOutcome(row: ExtendedHistoryRow, model: ModelDefinition) {
  if (row.forecastResult) {
    const correct = row.forecastResult.toLowerCase().includes("correct");
    return {
      label: row.forecastResult,
      color: correct ? "text-emerald-300" : "text-red-300",
    };
  }
  if (row.evaluationStatus !== "evaluated") {
    return { label: "Pending", color: "text-amber-300" };
  }
  const hit = model.kind === "hybrid" && row.directionHit == null
    ? row.rangePathHit
    : row.directionHit;
  if (hit === true) return { label: "Correct", color: "text-emerald-300" };
  if (hit === false) return { label: "Incorrect", color: "text-red-300" };
  return { label: "Evaluated", color: "text-zinc-300" };
}

function tradeColor(value?: string | null) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("profit") || text.includes("win") || text.includes("break-even") || text.includes("breakeven")) {
    return "text-emerald-300";
  }
  if (text.includes("loss") || text.includes("stop")) return "text-red-300";
  return "text-zinc-300";
}

function HistoryRow({
  row,
  model,
}: {
  row: ExtendedHistoryRow;
  model: ModelDefinition;
}) {
  const forecast = forecastOutcome(row, model);
  const trade = row.tradeResult ?? (row.evaluationStatus === "evaluated" ? "Not calculated" : "Pending");

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-black text-white">{dateTime(row.predictionTimeUtc)}</Text>
          <Text className={`mt-1 text-sm font-bold ${biasClass(row.bias)}`}>{row.bias}</Text>
          {model.kind === "consensus_direction" ? (
            <Text className="mt-1 text-[10px] font-bold uppercase text-zinc-500">
              Component: {row.modelKey}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Forecast</Text>
          <Text className={`mt-1 font-black ${forecast.color}`}>{forecast.label}</Text>
          {row.isNonOverlapping ? (
            <Text className="mt-1 text-[10px] font-black uppercase text-cyan-300">
              Independent episode
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Metric label="Entry" value={price(row.startPrice, model.asset)} />
        <Metric label="Horizon close" value={price(row.actualClose, model.asset)} />
        <Metric
          label="Horizon signed pips"
          value={signed(row.netPips)}
          valueClassName={
            typeof row.netPips === "number" && row.netPips >= 0
              ? "text-emerald-300"
              : "text-red-300"
          }
        />
      </View>

      <View className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Trade-management result
        </Text>
        <Text className={`mt-2 text-base font-black ${tradeColor(trade)}`}>{trade}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Metric label="Realized trade pips" value={signed(row.tradeNetPips)} />
          <Metric label="Maximum favorable move" value={signed(row.mfePips)} />
          <Metric label="Maximum adverse move" value={signed(row.maePips)} />
        </View>
        {row.partialProfitHit || row.breakevenArmed || row.runnerExitReason ? (
          <Text className="mt-3 text-xs leading-5 text-zinc-400">
            {row.partialProfitHit ? "Half profit reached. " : ""}
            {row.breakevenArmed ? "Runner protected at break-even. " : ""}
            {row.runnerExitReason ? `Runner exit: ${row.runnerExitReason}.` : ""}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function ModelHistorySection({
  model,
  history,
  mode,
  onModeChange,
}: {
  model: ModelDefinition;
  history: ExtendedHistoryRow[];
  mode: "all" | "independent";
  onModeChange: (mode: "all" | "independent") => void;
}) {
  const signals = history.filter(
    (row) => !String(row.bias).toLowerCase().includes("neutral")
  );
  const independent = signals.filter((row) => row.isNonOverlapping);
  const rows = mode === "independent" ? independent : signals;

  return (
    <View>
      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => onModeChange("all")}
          className={`flex-1 rounded-2xl border px-4 py-3 ${
            mode === "all"
              ? "border-cyan-500/50 bg-cyan-500/15"
              : "border-zinc-800 bg-zinc-950"
          }`}
        >
          <Text
            className={`text-center font-black ${
              mode === "all" ? "text-cyan-300" : "text-zinc-400"
            }`}
          >
            Active signals ({signals.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange("independent")}
          className={`flex-1 rounded-2xl border px-4 py-3 ${
            mode === "independent"
              ? "border-emerald-500/50 bg-emerald-500/15"
              : "border-zinc-800 bg-zinc-950"
          }`}
        >
          <Text
            className={`text-center font-black ${
              mode === "independent" ? "text-emerald-300" : "text-zinc-400"
            }`}
          >
            Independent ({independent.length})
          </Text>
        </Pressable>
      </View>

      {rows.length ? (
        rows.map((row) => (
          <HistoryRow
            key={`${row.modelKey}-${row.predictionTimeUtc}`}
            row={row}
            model={model}
          />
        ))
      ) : (
        <Card>
          <Text className="text-xl font-black text-white">No active signals yet</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Neutral monitoring reads are intentionally excluded. History appears after a model passes its production threshold and the backend uploads the exact model-keyed signal.
          </Text>
        </Card>
      )}
    </View>
  );
}
