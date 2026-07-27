import React from "react";
import { Text, View } from "react-native";

import type { ApiAsset, Candle } from "../services/api";
import type { ModelDefinition } from "../config/modelCatalog";

function formatPrice(value: number | undefined | null, symbol: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (symbol.includes("JPY")) return value.toFixed(3);
  if (symbol === "XAUUSD") return value.toFixed(2);
  return value.toFixed(5);
}

function directionState(value?: string | null) {
  const text = String(value ?? "Neutral").toLowerCase();
  if (text.includes("bull")) return "bullish" as const;
  if (text.includes("bear")) return "bearish" as const;
  return "neutral" as const;
}

function directionPresentation(direction: "bullish" | "bearish" | "neutral") {
  if (direction === "bullish") {
    return {
      arrow: "↗",
      label: "BULLISH DIRECTIONAL BIAS",
      text: "text-emerald-300",
      border: "border-emerald-500/40",
      background: "bg-emerald-500/10",
    };
  }
  if (direction === "bearish") {
    return {
      arrow: "↘",
      label: "BEARISH DIRECTIONAL BIAS",
      text: "text-red-300",
      border: "border-red-500/40",
      background: "bg-red-500/10",
    };
  }
  return {
    arrow: "→",
    label: "NO ACTIVE DIRECTIONAL SIGNAL",
    text: "text-sky-300",
    border: "border-sky-500/30",
    background: "bg-sky-500/10",
  };
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ModelProjectionChart({
  candles,
  asset,
  model,
}: {
  candles: Candle[];
  asset?: ApiAsset;
  model: ModelDefinition;
}) {
  const raw = asset as any;
  const lastCandle = candles[candles.length - 1];
  const currentPrice =
    finite(raw?.currentPrice) ??
    finite(raw?.close) ??
    finite(lastCandle?.close);
  const direction = directionState(raw?.bias);
  const visual = directionPresentation(direction);
  const confirmations = Number(raw?.confirmation_count ?? raw?.consecutive_confirmations ?? 0);
  const momentum = String(
    raw?.momentum_label ??
      raw?.momentum ??
      (direction === "neutral" ? "Waiting for a threshold-approved signal" : "New directional signal")
  );
  const signalTime = String(
    raw?.signal_active_since_belgrade ??
      raw?.episode_started_belgrade ??
      raw?.time_belgrade ??
      "Awaiting timestamp"
  );
  const rangeLow = finite(raw?.projectedLow ?? raw?.projected_low);
  const rangeHigh = finite(raw?.projectedHigh ?? raw?.projected_high);
  const hasRealRange =
    model.kind === "hybrid" &&
    rangeLow !== null &&
    rangeHigh !== null &&
    rangeHigh > rangeLow;

  return (
    <View className={`mb-5 rounded-3xl border p-5 ${visual.border} ${visual.background}`}>
      <Text className="text-xs font-black uppercase tracking-[3px] text-zinc-400">
        {model.horizonH}-hour model signal
      </Text>

      <View className="mt-4 flex-row items-center gap-5">
        <View className="h-28 w-28 items-center justify-center rounded-3xl border border-zinc-700 bg-black/40">
          <Text className={`text-7xl font-black ${visual.text}`}>{visual.arrow}</Text>
        </View>
        <View className="flex-1">
          <Text className={`text-2xl font-black leading-tight ${visual.text}`}>
            {visual.label}
          </Text>
          <Text className="mt-2 text-base font-bold text-white">{momentum}</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Direction models show a probabilistic bias, not an invented price path. A range is displayed only when the model actually supplies one.
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-2">
        <View className="min-w-[145px] flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Current price</Text>
          <Text className="mt-1 text-base font-black text-white">
            {formatPrice(currentPrice, model.asset)}
          </Text>
        </View>
        <View className="min-w-[145px] flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Confirmations</Text>
          <Text className="mt-1 text-base font-black text-white">
            {confirmations > 0 ? confirmations : direction === "neutral" ? "0" : "1"}
          </Text>
        </View>
        <View className="min-w-[145px] flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Signal active since</Text>
          <Text className="mt-1 text-sm font-black text-white">{signalTime}</Text>
        </View>
      </View>

      {hasRealRange ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="min-w-[145px] flex-1 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <Text className="text-[10px] font-bold uppercase text-amber-300">Model range low</Text>
            <Text className="mt-1 text-base font-black text-white">
              {formatPrice(rangeLow, model.asset)}
            </Text>
          </View>
          <View className="min-w-[145px] flex-1 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <Text className="text-[10px] font-bold uppercase text-amber-300">Model range high</Text>
            <Text className="mt-1 text-base font-black text-white">
              {formatPrice(rangeHigh, model.asset)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
