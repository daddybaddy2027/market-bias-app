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
import {
  Metric,
  SectionTitle,
  biasClasses,
  currentValue,
  pct,
  signed,
} from "./DashboardPrimitives";

const MODEL_DISPLAY_PRIORITY: Record<string, number> = {
  GBPUSD_12H_FINAL_APP_V2: 1,
};

const DISPLAY_MODELS = [...MODEL_CATALOG].sort((left, right) => {
  const leftPriority =
    MODEL_DISPLAY_PRIORITY[left.modelKey] ?? 100 + left.order;
  const rightPriority =
    MODEL_DISPLAY_PRIORITY[right.modelKey] ?? 100 + right.order;

  return leftPriority - rightPriority;
});

function ModelCard({
  model,
  asset,
  userIsPro,
}: {
  model: ModelDefinition;
  asset?: ApiAsset;
  userIsPro: boolean;
}) {
  const locked = model.tier === "Pro" && !userIsPro;
  const rawBias = String(asset?.bias ?? (model.kind === "range" ? "Range Only" : "Neutral"));
  const classes = locked
    ? {
        text: "text-violet-300",
        border: "border-violet-500/40",
        bg: "bg-violet-500/10",
      }
    : biasClasses(rawBias);

  const liveN = Number((asset as any)?.live_direction_n ?? 0);
  const liveAccuracy = (asset as any)?.live_direction_accuracy;
  const liveRangeN = Number((asset as any)?.live_range_path_n ?? 0);
  const liveRangeAccuracy = (asset as any)?.live_range_path_accuracy;
  const resolvedN = model.kind === "range" ? liveRangeN : liveN;
  const resolvedAccuracy = model.kind === "range" ? liveRangeAccuracy : liveAccuracy;

  const expectedMove = locked
    ? "Unlock Pro"
    : currentValue(asset, ["expectedMove", "expected_move_text"], "Awaiting output");
  const expectedRange = locked
    ? "Hidden"
    : currentValue(asset, ["expectedRange", "expected_range_text"], "Awaiting output");
  const confidence = locked ? "Hidden" : pct((asset as any)?.confidence, 0);
  const signalStatus = locked
    ? "Current prediction locked"
    : currentValue(
        asset,
        ["signal_status", "status", "model_status"],
        model.status === "live_verification"
          ? "Live verification in progress"
          : "Awaiting latest output"
      );

  function open() {
    if (locked) {
      router.push("/pricing" as never);
      return;
    }
    router.push(`/asset/${modelRoute(model)}` as never);
  }

  return (
    <Pressable
      onPress={open}
      className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 active:opacity-70"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-white">{model.displayName}</Text>
          <Text className="mt-1 text-sm text-zinc-500">
            {model.asset} · {model.horizonH}h · {model.kind}
          </Text>
        </View>

        <View className="items-end gap-2">
          <View className={`rounded-full border px-3 py-1 ${classes.border} ${classes.bg}`}>
            <Text className={`text-[10px] font-black ${classes.text}`}>
              {locked ? "PRO LOCKED" : rawBias.toUpperCase()}
            </Text>
          </View>
          <View
            className={`rounded-full border px-3 py-1 ${
              model.tier === "Free"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-violet-500/40 bg-violet-500/10"
            }`}
          >
            <Text
              className={`text-[10px] font-black ${
                model.tier === "Free" ? "text-emerald-300" : "text-violet-300"
              }`}
            >
              {model.tier.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-2">
        <Metric
          label="Expected move"
          value={expectedMove}
          valueClassName={locked ? "text-violet-300" : classes.text}
        />
        <Metric label={`${model.horizonH}h range`} value={expectedRange} />
      </View>

      <View className="mt-2 flex-row flex-wrap gap-2">
        <Metric
          label={model.performance.label}
          value={accuracyText(model.performance)}
          valueClassName={
            model.performance.source === "verified_live"
              ? "text-emerald-300"
              : model.performance.source === "range_history"
              ? "text-amber-300"
              : "text-cyan-300"
          }
        />
        <Metric label="Confidence" value={confidence} />
      </View>

      {model.independent ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Metric
            label={model.independent.label}
            value={`${(model.independent.accuracy * 100).toFixed(1)}% · ${model.independent.hits}/${model.independent.n}`}
            valueClassName="text-emerald-300"
          />
          <Metric
            label="Average signed result"
            value={signed(model.performance.averageSignedPips)}
            valueClassName="text-emerald-300"
          />
        </View>
      ) : null}

      {model.secondaryPerformance?.length ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {model.secondaryPerformance.map((stat) => (
            <Metric
              key={stat.label}
              label={stat.label}
              value={accuracyText(stat)}
              valueClassName="text-cyan-300"
            />
          ))}
        </View>
      ) : null}

      {model.performance.source === "walk_forward_evaluation" ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Metric
            label="Evaluation expectancy"
            value={signed(model.performance.expectancyPips)}
            valueClassName="text-cyan-300"
          />
          <Metric
            label="Evaluation profit factor"
            value={
              typeof model.performance.profitFactor === "number"
                ? model.performance.profitFactor.toFixed(2)
                : "N/A"
            }
          />
        </View>
      ) : null}

      <View className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {model.status === "live_verification" ? "Live verification" : "Signal status"}
        </Text>
        <Text className="mt-1 text-sm font-bold text-sky-300">{signalStatus}</Text>
        {model.status === "live_verification" ? (
          <Text className="mt-1 text-xs leading-5 text-zinc-500">
            {resolvedN > 0
              ? `${pct(resolvedAccuracy, 1)} live accuracy · n=${resolvedN}`
              : "Collecting real post-launch outcomes. Evaluation and live results remain separate."}
          </Text>
        ) : null}
      </View>

      <Text className="mt-4 text-sm leading-6 text-zinc-400">{model.purpose}</Text>
      {model.performance.note ? (
        <Text className="mt-2 text-xs leading-5 text-zinc-500">{model.performance.note}</Text>
      ) : null}
    </Pressable>
  );
}

export function ModelBoardSection({
  assets,
  userIsPro,
}: {
  assets: ApiAsset[];
  userIsPro: boolean;
}) {
  return (
    <View>
      <SectionTitle
        kicker="Predictions"
        title="Live model assets"
        subtitle="The market-intelligence experience remains intact. Only the model set, access rules and verified-history labels have changed."
      />
      {DISPLAY_MODELS.map((model) => (
        <ModelCard
          key={model.modelKey}
          model={model}
          asset={findAssetForModel(model, assets)}
          userIsPro={userIsPro}
        />
      ))}
    </View>
  );
}

export const MODEL_COUNTS = {
  total: MODEL_CATALOG.length,
  free: MODEL_CATALOG.filter((model) => model.tier === "Free").length,
  pro: MODEL_CATALOG.filter((model) => model.tier === "Pro").length,
};
