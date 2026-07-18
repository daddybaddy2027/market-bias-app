import { router, useLocalSearchParams } from "expo-router";
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
  type ApiAsset,
  type Candle,
  type MarketState,
  fetchCandles,
  fetchMarketState,
} from "../services/api";
import {
  fetchExactModelHistory,
  type ExtendedHistoryRow,
} from "../services/modelHistory";
import {
  MODEL_CATALOG,
  accuracyText,
  findAssetForModel,
  findModelDefinition,
  modelSlug,
  type ModelDefinition,
} from "../config/modelCatalog";
import { useAuth } from "../providers/AuthProvider";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}>{children}</View>;
}

function Metric({ label, value, valueClassName = "text-white" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</Text>
      <Text className={`mt-1 text-base font-black ${valueClassName}`}>{value}</Text>
    </View>
  );
}

function pct(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(digits)}%`;
}

function signed(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)} pips`;
}

function price(value?: number | null, asset = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (asset.includes("JPY")) return value.toFixed(3);
  if (asset === "XAUUSD") return value.toFixed(2);
  return value.toFixed(5);
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

function parseRoute(raw?: string | string[]) {
  const value = decodeURIComponent(Array.isArray(raw) ? raw[0] ?? "" : raw ?? "");
  const match = value.toUpperCase().match(/^([A-Z0-9]+)-(\d+)H-(.+)$/);
  if (!match) return null;
  return { asset: match[1], horizonH: Number(match[2]), modelKey: modelSlug(match[3]) };
}

function biasClass(value?: string | null) {
  const text = String(value ?? "Neutral").toLowerCase();
  if (text.includes("bull")) return "text-emerald-300";
  if (text.includes("bear")) return "text-red-300";
  if (text.includes("range")) return "text-amber-300";
  return "text-sky-300";
}

function currentText(asset: any, keys: string[], fallback = "N/A") {
  for (const key of keys) {
    const value = asset?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return fallback;
}

function historyOutcome(row: ExtendedHistoryRow, model: ModelDefinition) {
  if (row.evaluationStatus !== "evaluated") return { label: "Pending", color: "text-amber-300" };
  const hit = model.kind === "range" ? row.rangePathHit : row.directionHit;
  if (hit === true) return { label: "Correct", color: "text-emerald-300" };
  if (hit === false) return { label: "Incorrect", color: "text-red-300" };
  return { label: "Evaluated", color: "text-zinc-300" };
}

function HistoryRow({ row, model }: { row: ExtendedHistoryRow; model: ModelDefinition }) {
  const outcome = historyOutcome(row, model);
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-black text-white">{dateTime(row.predictionTimeUtc)}</Text>
          <Text className={`mt-1 text-sm font-bold ${biasClass(row.bias)}`}>{row.bias}</Text>
        </View>
        <View className="items-end">
          <Text className={`font-black ${outcome.color}`}>{outcome.label}</Text>
          {row.isNonOverlapping ? (
            <Text className="mt-1 text-[10px] font-black uppercase text-cyan-300">Independent</Text>
          ) : null}
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Metric label="Entry" value={price(row.startPrice, model.asset)} />
        <Metric label="Final" value={price(row.actualClose, model.asset)} />
        <Metric
          label="Signed pips"
          value={signed(row.netPips)}
          valueClassName={typeof row.netPips === "number" && row.netPips >= 0 ? "text-emerald-300" : "text-red-300"}
        />
      </View>
    </Card>
  );
}

export default function ModelDetailScreen() {
  const params = useLocalSearchParams<{ symbol?: string | string[] }>();
  const parsed = parseRoute(params.symbol);
  const fallbackModel = parsed
    ? MODEL_CATALOG.find((item) => item.asset === parsed.asset && item.horizonH === parsed.horizonH)
    : undefined;
  const model = findModelDefinition(parsed?.modelKey) ?? fallbackModel;
  const { isPro } = useAuth();

  const [market, setMarket] = useState<MarketState | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [history, setHistory] = useState<ExtendedHistoryRow[]>([]);
  const [historyMode, setHistoryMode] = useState<"all" | "independent">("all");
  const [tab, setTab] = useState<"projection" | "history">("projection");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = Boolean(model && model.tier === "Pro" && !isPro);

  const load = useCallback(async (refresh = false) => {
    if (!model) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextMarket, nextCandles] = await Promise.all([
        fetchMarketState(),
        fetchCandles(model.asset, 72).catch(() => []),
      ]);
      setMarket(nextMarket);
      setCandles(nextCandles);
      setHistory(locked ? [] : await fetchExactModelHistory(model, 250));
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locked, model]);

  useEffect(() => {
    void load();
  }, [load]);

  const asset: ApiAsset | undefined = model ? findAssetForModel(model, market?.assets ?? []) : undefined;
  const visibleHistory = useMemo(
    () => historyMode === "independent" ? history.filter((row) => row.isNonOverlapping) : history,
    [history, historyMode]
  );

  if (!model) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-white">Model not found</Text>
        <Pressable onPress={() => router.replace("/" as never)} className="mt-5 rounded-2xl bg-zinc-900 px-5 py-4">
          <Text className="font-black text-zinc-300">Back to dashboard</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentBias = locked ? "Locked" : String(asset?.bias ?? "Neutral");
  const liveN = Number((asset as any)?.live_direction_n ?? (asset as any)?.live_range_path_n ?? 0);
  const liveAccuracy = (asset as any)?.live_direction_accuracy ?? (asset as any)?.live_range_path_accuracy;
  const latestCandle = candles[candles.length - 1];

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={Platform.OS === "web" ? ({ height: "100vh" } as any) : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        <Pressable onPress={() => router.back()} className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <Text className="font-bold text-zinc-300">← Back to model board</Text>
        </Pressable>

        <View className="mb-5 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-black uppercase tracking-[3px] text-cyan-300">{model.tier} · {model.kind}</Text>
            <Text className="mt-3 text-3xl font-black leading-tight text-white">{model.displayName}</Text>
            <Text className="mt-2 text-sm text-zinc-500">{model.modelKey}</Text>
          </View>
          <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
            <Text className={`text-xs font-black ${locked ? "text-violet-300" : biasClass(currentBias)}`}>
              {locked ? "PRO LOCKED" : currentBias.toUpperCase()}
            </Text>
          </View>
        </View>

        <View className="mb-5 flex-row gap-2">
          <Pressable
            onPress={() => setTab("projection")}
            className={`flex-1 rounded-2xl border px-4 py-3 ${tab === "projection" ? "border-emerald-500/50 bg-emerald-500/15" : "border-zinc-800 bg-zinc-950"}`}
          >
            <Text className={`text-center font-black ${tab === "projection" ? "text-emerald-300" : "text-zinc-400"}`}>Projection</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("history")}
            className={`flex-1 rounded-2xl border px-4 py-3 ${tab === "history" ? "border-cyan-500/50 bg-cyan-500/15" : "border-zinc-800 bg-zinc-950"}`}
          >
            <Text className={`text-center font-black ${tab === "history" ? "text-cyan-300" : "text-zinc-400"}`}>History</Text>
          </Pressable>
        </View>

        {error ? (
          <Card className="mb-5 border-red-500/40 bg-red-500/10">
            <Text className="font-black text-red-300">Data error</Text>
            <Text className="mt-2 text-sm text-zinc-300">{error}</Text>
          </Card>
        ) : null}

        <Card className="mb-5 border-cyan-500/25 bg-cyan-500/5">
          <Text className="text-xs font-black uppercase tracking-wider text-cyan-300">Performance source</Text>
          <Text className="mt-2 text-2xl font-black text-white">{model.performance.label}</Text>
          <Text className="mt-2 text-3xl font-black text-cyan-300">{accuracyText(model.performance)}</Text>
          {model.performance.period ? <Text className="mt-2 text-sm text-zinc-500">Period: {model.performance.period}</Text> : null}
          {model.performance.note ? <Text className="mt-3 text-sm leading-6 text-zinc-400">{model.performance.note}</Text> : null}
        </Card>

        <View className="mb-5 flex-row flex-wrap gap-2">
          {model.independent ? (
            <Metric
              label={model.independent.label}
              value={`${(model.independent.accuracy * 100).toFixed(1)}% · ${model.independent.hits}/${model.independent.n}`}
              valueClassName="text-emerald-300"
            />
          ) : null}
          {typeof model.performance.averageSignedPips === "number" ? (
            <Metric label="Average signed result" value={signed(model.performance.averageSignedPips)} valueClassName="text-emerald-300" />
          ) : null}
          {typeof model.performance.expectancyPips === "number" ? (
            <Metric label="Evaluation expectancy" value={signed(model.performance.expectancyPips)} valueClassName="text-cyan-300" />
          ) : null}
          {typeof model.performance.profitFactor === "number" ? (
            <Metric label="Evaluation profit factor" value={model.performance.profitFactor.toFixed(2)} />
          ) : null}
        </View>

        {model.secondaryPerformance?.length ? (
          <View className="mb-5 flex-row flex-wrap gap-2">
            {model.secondaryPerformance.map((stat) => (
              <Metric key={stat.label} label={stat.label} value={accuracyText(stat)} valueClassName="text-cyan-300" />
            ))}
          </View>
        ) : null}

        {model.status === "live_verification" ? (
          <Card className="mb-5 border-violet-500/30 bg-violet-500/10">
            <Text className="text-xs font-black uppercase tracking-wider text-violet-300">Live verification</Text>
            <Text className="mt-2 text-xl font-black text-white">{liveN > 0 ? `${pct(liveAccuracy, 1)} · n=${liveN}` : "Collecting outcomes"}</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">Evaluation performance remains visible separately. Live results will never overwrite the walk-forward record.</Text>
          </Card>
        ) : null}

        {tab === "projection" ? (
          locked ? (
            <Card className="border-violet-500/40 bg-violet-500/10">
              <Text className="text-2xl font-black text-white">Current prediction is Pro</Text>
              <Text className="mt-3 text-sm leading-6 text-zinc-300">Historical and evaluation statistics remain public. Current bias, probability, confidence and forecast zone require Pro access.</Text>
              <Pressable onPress={() => router.push("/pricing" as never)} className="mt-5 rounded-2xl bg-violet-500/20 px-5 py-4">
                <Text className="text-center font-black text-violet-200">View Pro access</Text>
              </Pressable>
            </Card>
          ) : (
            <>
              <View className="mb-5 flex-row flex-wrap gap-2">
                <Metric label="Current bias" value={currentBias} valueClassName={biasClass(currentBias)} />
                <Metric label="Confidence" value={pct((asset as any)?.confidence, 0)} />
                <Metric label="Latest price" value={price((asset as any)?.currentPrice ?? (asset as any)?.close ?? latestCandle?.close, model.asset)} />
              </View>
              <View className="mb-5 flex-row flex-wrap gap-2">
                <Metric label="Expected move" value={currentText(asset, ["expectedMove", "expected_move_text"], "Awaiting output")} />
                <Metric label="Forecast range" value={currentText(asset, ["expectedRange", "expected_range_text"], "Awaiting output")} />
                <Metric label="Up probability" value={pct((asset as any)?.prob_up, 1)} />
              </View>
              <Card>
                <Text className="text-xl font-black text-white">Model status</Text>
                <Text className="mt-2 text-sm font-bold text-sky-300">{currentText(asset, ["signal_status", "status", "model_status"], loading ? "Loading" : "Awaiting latest output")}</Text>
                <Text className="mt-3 text-sm leading-6 text-zinc-400">{model.purpose}</Text>
              </Card>
            </>
          )
        ) : locked ? (
          <Card className="border-violet-500/40 bg-violet-500/10">
            <Text className="text-xl font-black text-white">Full history requires Pro</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-300">The performance summary remains public. Exact prediction rows are protected for Pro users.</Text>
          </Card>
        ) : (
          <>
            <View className="mb-4 flex-row gap-2">
              <Pressable
                onPress={() => setHistoryMode("all")}
                className={`flex-1 rounded-2xl border px-4 py-3 ${historyMode === "all" ? "border-cyan-500/50 bg-cyan-500/15" : "border-zinc-800 bg-zinc-950"}`}
              >
                <Text className={`text-center font-black ${historyMode === "all" ? "text-cyan-300" : "text-zinc-400"}`}>All signals ({history.length})</Text>
              </Pressable>
              <Pressable
                onPress={() => setHistoryMode("independent")}
                className={`flex-1 rounded-2xl border px-4 py-3 ${historyMode === "independent" ? "border-emerald-500/50 bg-emerald-500/15" : "border-zinc-800 bg-zinc-950"}`}
              >
                <Text className={`text-center font-black ${historyMode === "independent" ? "text-emerald-300" : "text-zinc-400"}`}>Independent ({history.filter((row) => row.isNonOverlapping).length})</Text>
              </Pressable>
            </View>

            {visibleHistory.length ? (
              visibleHistory.map((row) => <HistoryRow key={`${row.modelKey}-${row.predictionTimeUtc}`} row={row} model={model} />)
            ) : (
              <Card>
                <Text className="text-xl font-black text-white">No rows yet</Text>
                <Text className="mt-2 text-sm leading-6 text-zinc-400">History appears after the backend uploads exact model-keyed predictions and their outcomes.</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
