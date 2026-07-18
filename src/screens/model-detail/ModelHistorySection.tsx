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
  if (text.includes("range")) return "text-amber-300";
  return "text-sky-300";
}

function outcome(row: ExtendedHistoryRow, model: ModelDefinition) {
  if (row.evaluationStatus !== "evaluated") {
    return { label: "Pending", color: "text-amber-300" };
  }
  const hit = model.kind === "range" ? row.rangePathHit : row.directionHit;
  if (hit === true) return { label: "Correct", color: "text-emerald-300" };
  if (hit === false) return { label: "Incorrect", color: "text-red-300" };
  return { label: "Evaluated", color: "text-zinc-300" };
}

function HistoryRow({
  row,
  model,
}: {
  row: ExtendedHistoryRow;
  model: ModelDefinition;
}) {
  const result = outcome(row, model);
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-black text-white">{dateTime(row.predictionTimeUtc)}</Text>
          <Text className={`mt-1 text-sm font-bold ${biasClass(row.bias)}`}>{row.bias}</Text>
        </View>
        <View className="items-end">
          <Text className={`font-black ${result.color}`}>{result.label}</Text>
          {row.isNonOverlapping ? (
            <Text className="mt-1 text-[10px] font-black uppercase text-cyan-300">
              Independent
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Metric label="Entry" value={price(row.startPrice, model.asset)} />
        <Metric label="Final" value={price(row.actualClose, model.asset)} />
        <Metric
          label="Signed pips"
          value={signed(row.netPips)}
          valueClassName={
            typeof row.netPips === "number" && row.netPips >= 0
              ? "text-emerald-300"
              : "text-red-300"
          }
        />
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
  const independent = history.filter((row) => row.isNonOverlapping);
  const rows = mode === "independent" ? independent : history;

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
            All signals ({history.length})
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
          <Text className="text-xl font-black text-white">No rows yet</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            History appears after the backend uploads exact model-keyed predictions and their outcomes.
          </Text>
        </Card>
      )}
    </View>
  );
}
