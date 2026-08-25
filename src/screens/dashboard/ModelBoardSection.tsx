import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { ApiAsset } from "../../services/api";
import {
  MODEL_CATALOG,
  accuracyText,
  findAssetForModel,
  modelRoute,
  type ModelDefinition,
} from "../../config/modelCatalog";
import { Metric, SectionTitle, biasClasses, currentValue, pct, signed } from "./DashboardPrimitives";

function arrow(value?: string | null) {
  const text = String(value ?? "Neutral").toLowerCase();
  return text.includes("bull") ? "↗" : text.includes("bear") ? "↘" : "→";
}

function liveAccuracyText(asset?: ApiAsset) {
  const raw = asset as any;
  const value = Number(raw?.live_direction_accuracy);

  if (!Number.isFinite(value)) {
    return "Collecting";
  }

  const percentage = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

function ModelCard({ model, asset, userIsPro }: {
  model: ModelDefinition;
  asset?: ApiAsset;
  userIsPro: boolean;
}) {
  const raw = asset as any;
  const locked = model.tier === "Pro" && !userIsPro;
  const bias = String(raw?.bias ?? "Neutral");
  const classes = locked
    ? { text: "text-violet-300", border: "border-violet-500/40", bg: "bg-violet-500/10" }
    : biasClasses(bias);
  const confirmations = Number(raw?.confirmation_count ?? 0);
  const momentum = locked
    ? "Current signal locked"
    : currentValue(asset, ["momentum_label", "momentum", "signal_status", "status"],
        bias === "Neutral" ? "No threshold-approved signal" : "New directional signal");

  const open = () => locked
    ? router.push("/pricing" as never)
    : router.push(`/asset/${modelRoute(model)}` as never);

  if (locked) {
    return (
      <Pressable onPress={open} className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 active:opacity-70">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-black text-white">{model.displayName}</Text>
            <Text className="mt-1 text-sm text-zinc-500">{model.asset} · {model.horizonH}h</Text>
          </View>
          <View className={`rounded-full border px-3 py-1 ${classes.border} ${classes.bg}`}>
            <Text className={`text-[10px] font-black ${classes.text}`}>PRO LOCKED</Text>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-violet-500/25 bg-violet-500/5 p-5">
          <Text className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Current live accuracy
          </Text>
          <Text className="mt-2 text-4xl font-black text-cyan-300">
            {liveAccuracyText(asset)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={open} className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 active:opacity-70">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-white">{model.displayName}</Text>
          <Text className="mt-1 text-sm text-zinc-500">{model.asset} · {model.horizonH}h</Text>
        </View>
        <View className={`rounded-full border px-3 py-1 ${classes.border} ${classes.bg}`}>
          <Text className={`text-[10px] font-black ${classes.text}`}>{bias.toUpperCase()}</Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
        <Text className={`text-6xl font-black ${classes.text}`}>{arrow(bias)}</Text>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Directional read</Text>
          <Text className={`mt-1 text-base font-black ${classes.text}`}>{momentum}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Metric label="Confidence" value={pct(raw?.confidence, 0)} />
        <Metric label="Confirmations" value={String(confirmations || (bias === "Neutral" ? 0 : 1))} />
        {model.kind === "hybrid" ? (
          <Metric label="Model range" value={currentValue(asset, ["expectedRange", "expected_range_text"], "Awaiting range")} />
        ) : null}
      </View>

      <View className="mt-2 flex-row flex-wrap gap-2">
        <Metric label={model.performance.label} value={accuracyText(model.performance)} valueClassName="text-cyan-300" />
        {typeof model.performance.totalSignedPips === "number" ? (
          <Metric label="Strict replay signed pips" value={signed(model.performance.totalSignedPips)} valueClassName="text-emerald-300" />
        ) : null}
      </View>

      {model.independent ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Metric label={model.independent.label} value={`${(model.independent.accuracy * 100).toFixed(1)}% · ${model.independent.hits}/${model.independent.n}`} valueClassName="text-emerald-300" />
        </View>
      ) : null}

      {model.secondaryPerformance?.length ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {model.secondaryPerformance.map((stat) => (
            <Metric key={stat.label} label={stat.label} value={accuracyText(stat)} valueClassName="text-cyan-300" />
          ))}
        </View>
      ) : null}

      <Text className="mt-4 text-sm leading-6 text-zinc-400">{model.purpose}</Text>
      <Text className={`mt-3 text-[10px] font-black uppercase ${model.tier === "Free" ? "text-emerald-300" : "text-violet-300"}`}>
        {model.tier}
      </Text>
    </Pressable>
  );
}

export function ModelBoardSection({ assets, userIsPro }: { assets: ApiAsset[]; userIsPro: boolean }) {
  return (
    <View>
      <SectionTitle
        kicker="Production signals"
        title="Six selected model products"
        subtitle="Only threshold-approved products are shown. Neutral monitoring reads and research candidates stay off the commercial board."
      />
      {MODEL_CATALOG.map((model) => (
        <ModelCard key={model.modelKey} model={model} asset={findAssetForModel(model, assets)} userIsPro={userIsPro} />
      ))}
    </View>
  );
}

export const MODEL_COUNTS = {
  total: MODEL_CATALOG.length,
  free: MODEL_CATALOG.filter((model) => model.tier === "Free").length,
  pro: MODEL_CATALOG.filter((model) => model.tier === "Pro").length,
};
