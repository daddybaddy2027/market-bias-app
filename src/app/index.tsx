import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  API_BASE,
  type ApiAsset,
  type MarketState,
  fetchMarketState,
} from "../services/api";
import { useAuth } from "../providers/AuthProvider";
import { SupportProjectButton } from "../components/SupportProjectButton";
import {
  MODEL_CATALOG,
  accuracyText,
  findAssetForModel,
  modelRoute,
  type ModelDefinition,
} from "../config/modelCatalog";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}>
      {children}
    </View>
  );
}

function Metric({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </Text>
      <Text className={`mt-1 text-base font-black ${valueClassName}`}>{value}</Text>
    </View>
  );
}

function pct(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(digits)}%`;
}

function signed(value?: number | null, suffix = " pips") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function biasClasses(bias: string) {
  const value = bias.toLowerCase();
  if (value.includes("bull")) {
    return {
      text: "text-emerald-300",
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
    };
  }
  if (value.includes("bear")) {
    return {
      text: "text-red-300",
      border: "border-red-500/40",
      bg: "bg-red-500/10",
    };
  }
  if (value.includes("range")) {
    return {
      text: "text-amber-300",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
    };
  }
  return {
    text: "text-sky-300",
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
  };
}

function currentValue(asset: any, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = asset?.[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  return fallback;
}

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
        <Metric label="Expected move" value={expectedMove} valueClassName={locked ? "text-violet-300" : classes.text} />
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
            <Metric key={stat.label} label={stat.label} value={accuracyText(stat)} valueClassName="text-cyan-300" />
          ))}
        </View>
      ) : null}

      {model.performance.source === "walk_forward_evaluation" ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Metric label="Evaluation expectancy" value={signed(model.performance.expectancyPips)} valueClassName="text-cyan-300" />
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

export default function DashboardScreen() {
  const { isAuthenticated, isPro } = useAuth();
  const [market, setMarket] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setMarket(await fetchMarketState());
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assets = market?.assets ?? [];
  const modelRows = useMemo(
    () => MODEL_CATALOG.map((model) => ({ model, asset: findAssetForModel(model, assets) })),
    [assets]
  );

  const freeCount = MODEL_CATALOG.filter((model) => model.tier === "Free").length;
  const proCount = MODEL_CATALOG.length - freeCount;

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={Platform.OS === "web" ? ({ height: "100vh" } as any) : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-black uppercase tracking-[4px] text-emerald-300">
              AI MARKET EXPERT
            </Text>
            <Text className="mt-3 text-4xl font-black leading-tight text-white">
              Full live model board
            </Text>
            <Text className="mt-3 text-sm leading-6 text-zinc-400">
              {MODEL_CATALOG.length} models · {freeCount} Free · {proCount} Pro · €24.99/month
            </Text>
          </View>
          <View className="gap-2">
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              className="rounded-2xl border border-violet-500/40 bg-violet-500/15 px-4 py-3 active:opacity-70"
            >
              <Text className="text-center text-xs font-black text-violet-200">PRO</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push((isAuthenticated ? "/account" : "/login") as never)}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 active:opacity-70"
            >
              <Text className="text-center text-xs font-black text-zinc-300">
                {isAuthenticated ? "ACCOUNT" : "LOGIN"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Card className="mb-4 border-emerald-500/25 bg-emerald-500/5">
          <View className="flex-row flex-wrap gap-2">
            <Metric label="Active regime" value={market?.activeRegime ?? (loading ? "Loading" : "Unavailable")} valueClassName="text-emerald-300" />
            <Metric label="Market data" value={formatTime(market?.marketDataTimeUTC ?? market?.generatedAt)} />
            <Metric label="Data source" value={API_BASE} />
          </View>
          {market?.regimeExplanation ? (
            <Text className="mt-4 text-sm leading-6 text-zinc-400">{market.regimeExplanation}</Text>
          ) : null}
        </Card>

        {error ? (
          <Card className="mb-4 border-red-500/40 bg-red-500/10">
            <Text className="font-black text-red-300">Market data error</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-300">{error}</Text>
            <Pressable
              onPress={() => void load()}
              className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3"
            >
              <Text className="text-center font-black text-red-200">Retry</Text>
            </Pressable>
          </Card>
        ) : null}

        <View className="mb-3 mt-4">
          <Text className="text-xs font-black uppercase tracking-[3px] text-cyan-300">
            MODEL BOARD
          </Text>
          <Text className="mt-2 text-2xl font-black text-white">Thirteen final model views</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-500">
            Verified live statistics and walk-forward evaluation statistics are explicitly separated.
          </Text>
        </View>

        {modelRows.map(({ model, asset }) => (
          <ModelCard key={model.modelKey} model={model} asset={asset} userIsPro={Boolean(isPro)} />
        ))}

        {market?.currencyStrength?.length ? (
          <View className="mt-4">
            <Text className="mb-3 text-xl font-black text-white">Currency strength</Text>
            <View className="flex-row flex-wrap gap-2">
              {market.currencyStrength.slice(0, 8).map((item) => (
                <View key={item.code} className="min-w-[145px] flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <Text className="text-lg font-black text-white">{item.code}</Text>
                  <Text className="mt-1 text-sm text-zinc-400">{item.bias}</Text>
                  <Text className="mt-2 text-xs text-zinc-500">Score {Number(item.score ?? 0).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {market?.drivers?.length ? (
          <View className="mt-7">
            <Text className="mb-3 text-xl font-black text-white">Cross-asset drivers</Text>
            {market.drivers.slice(0, 6).map((driver) => (
              <Card key={driver.key} className="mb-3">
                <Text className="text-base font-black text-white">{driver.title}</Text>
                <Text className="mt-1 text-sm font-bold text-cyan-300">{driver.state}</Text>
                <Text className="mt-2 text-sm leading-6 text-zinc-400">{driver.detail}</Text>
              </Card>
            ))}
          </View>
        ) : null}

        <View className="mt-7">
          <SupportProjectButton />
        </View>

        <Text className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Decision support only. Evaluation accuracy is not live accuracy, and neither is a guarantee of future performance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
