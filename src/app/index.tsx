import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  ApiAsset,
  Bias,
  CurrencyStrengthItem,
  MarketDriver,
  MarketState,
  PerformanceSummaryRow,
  fetchMarketState,
  fetchPerformanceSummary,
  getAssetKey,
  getAssetSymbol,
} from "../services/api";

type AccessTier = "Free" | "Pro";

type CardAsset = {
  key: string;
  routeSymbol: string;
  symbol: string;
  display: string;
  horizonH: number;
  bias: Bias;
  confidence: number;
  expectedMove: string;
  expectedRange: string;
  status: string;
  explanation: string;
  drivers: string[];
  modelFamily: string;
  tier: AccessTier;
  locked: boolean;
  liveAccuracy: number | null;
  accuracyN: number;
};

const ENABLE_PRO_LOCKS = false;

const FREE_KEYS = new Set(["GBPJPY-12", "EURUSD-6"]);
const PRO_KEYS = new Set([
  "EURJPY-12",
  "EURUSD-3",
  "GBPAUD-3",
  "GBPAUD-6",
]);
const HIDDEN_SYMBOLS = new Set(["XAUUSD", "USDJPY"]);

function pct(value?: number | null, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

function getBiasClasses(bias: Bias) {
  if (bias === "Bullish") {
    return {
      text: "text-emerald-300",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
    };
  }

  if (bias === "Bearish") {
    return {
      text: "text-red-300",
      bg: "bg-red-500/15",
      border: "border-red-500/40",
    };
  }

  return {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-500/40",
  };
}

function getStateColor(state: string) {
  const value = state.toLowerCase();

  if (
    value.includes("risk-on") ||
    value.includes("strength") ||
    value.includes("constructive") ||
    value.includes("contained") ||
    value.includes("bid")
  ) {
    return "text-emerald-300";
  }

  if (
    value.includes("risk-off") ||
    value.includes("defensive") ||
    value.includes("weak") ||
    value.includes("elevated")
  ) {
    return "text-red-300";
  }

  return "text-zinc-300";
}

function getConfidence(item: ApiAsset) {
  if (typeof item.confidence === "number" && Number.isFinite(item.confidence)) {
    return item.confidence;
  }
  if (item.confidence_label === "high") return 0.75;
  if (item.confidence_label === "medium") return 0.5;
  if (item.confidence_label === "normal") return 0.35;
  return 0;
}

function normalizeAsset(
  item: ApiAsset,
  summaryMap: Map<string, PerformanceSummaryRow>
): CardAsset {
  const symbol = getAssetSymbol(item);
  const horizonH = item.horizon_h ?? 12;
  const key = `${symbol}-${horizonH}`;
  const summary = summaryMap.get(key);
  const tier: AccessTier = FREE_KEYS.has(key) ? "Free" : "Pro";

  return {
    key,
    routeSymbol: `${symbol}-${horizonH}h`,
    symbol: `${symbol} ${horizonH}h`,
    display: item.display ?? symbol,
    horizonH,
    bias: item.bias ?? "Neutral",
    confidence: getConfidence(item),
    expectedMove: item.expectedMove ?? "N/A",
    expectedRange: item.expectedRange ?? "N/A",
    status: item.status ?? item.signal_strength ?? "Model read",
    explanation:
      item.explanation?.trim() ||
      `${symbol} ${horizonH}h probabilistic live model output. Models and cross-asset state currently refresh every closed market hour.`,
    drivers: item.drivers ?? [],
    modelFamily: item.model_family ?? item.source ?? "model",
    tier,
    locked: ENABLE_PRO_LOCKS && tier === "Pro",
    liveAccuracy:
      typeof summary?.direction_accuracy === "number"
        ? summary.direction_accuracy
        : null,
    accuracyN: summary?.direction_predictions ?? 0,
  };
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}
    >
      {children}
    </View>
  );
}

function SmallMetric({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-zinc-900 p-4">
      <Text className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </Text>
      <Text className={`mt-1 text-base font-bold ${valueClassName}`}>
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.max(4, Math.min(100, Math.round(value * 100)));
  const color =
    value >= 0.7
      ? "bg-emerald-400"
      : value >= 0.35
      ? "bg-yellow-300"
      : "bg-sky-300";

  return (
    <View className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
      <View
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </View>
  );
}

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-emerald-400">
        {kicker}
      </Text>
      <Text className="text-2xl font-black text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</Text>
    </View>
  );
}

function AssetCard({ item }: { item: CardAsset }) {
  const classes = getBiasClasses(item.bias);

  return (
    <Pressable
      disabled={item.locked}
      onPress={() =>
        !item.locked && router.push(`/asset/${item.routeSymbol}` as never)
      }
      className={`mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${
        item.locked ? "opacity-80" : "active:opacity-70"
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-black text-white">{item.symbol}</Text>
          <Text className="mt-1 text-sm text-zinc-500">
            {item.display} · {item.modelFamily}
          </Text>
        </View>

        <View className="items-end gap-2">
          <View
            className={`rounded-full border px-3 py-1 ${classes.bg} ${classes.border}`}
          >
            <Text className={`text-xs font-black ${classes.text}`}>
              {item.locked ? "Locked" : item.bias}
            </Text>
          </View>

          <View
            className={`rounded-full border px-3 py-1 ${
              item.tier === "Free"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-violet-500/40 bg-violet-500/10"
            }`}
          >
            <Text
              className={`text-[10px] font-black ${
                item.tier === "Free" ? "text-emerald-300" : "text-violet-300"
              }`}
            >
              {item.tier.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row gap-2">
        <SmallMetric
          label="Expected move"
          value={item.locked ? "Pro access" : item.expectedMove}
          valueClassName={item.locked ? "text-violet-300" : classes.text}
        />
        <SmallMetric
          label={`${item.horizonH}h range`}
          value={item.locked ? "Pro access" : item.expectedRange}
        />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric
          label="Live accuracy"
          value={
            item.liveAccuracy === null
              ? "Collecting"
              : `${pct(item.liveAccuracy, 1)} · n=${item.accuracyN}`
          }
        />
        <SmallMetric
          label="Confidence"
          value={item.locked ? "Hidden" : pct(item.confidence)}
        />
      </View>

      {!item.locked ? (
        <>
          <ProgressBar value={item.confidence} />
          <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <Text className="text-xs uppercase tracking-wider text-zinc-500">
              Signal status
            </Text>
            <Text className="mt-1 text-sm font-bold text-sky-300">
              {item.status}
            </Text>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-400">
            {item.explanation}
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {item.drivers.map((driver) => (
              <View
                key={driver}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1"
              >
                <Text className="text-xs font-semibold text-zinc-300">
                  {driver}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
          <Text className="font-black text-violet-300">Pro model preview</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Full prediction and verified history are planned for the €10/month
            beta tier. Real protection later requires backend authentication.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function DriverCard({ item }: { item: MarketDriver }) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-white">{item.title}</Text>
          <Text className={`mt-1 text-sm font-semibold ${getStateColor(item.state)}`}>
            {item.state}
          </Text>
        </View>
        <Text className="text-lg font-black text-white">{pct(item.strength)}</Text>
      </View>
      <ProgressBar value={item.strength} />
      <Text className="mt-3 text-sm leading-6 text-zinc-400">{item.detail}</Text>
    </Card>
  );
}

function CurrencyRow({ item, index }: { item: CurrencyStrengthItem; index: number }) {
  return (
    <View className="mb-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-2xl bg-zinc-900">
            <Text className="font-black text-zinc-300">#{index + 1}</Text>
          </View>
          <View>
            <Text className="text-lg font-black text-white">{item.code}</Text>
            <Text className="text-xs text-zinc-500">{item.name}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-black text-white">{item.score}/100</Text>
          <Text className="text-xs text-zinc-500">{item.bias}</Text>
        </View>
      </View>
      <ProgressBar value={item.score / 100} />
      <Text className="mt-3 text-sm leading-6 text-zinc-400">{item.note}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [data, setData] = useState<MarketState | null>(null);
  const [performance, setPerformance] = useState<PerformanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);

      const [marketResult, performanceResult] = await Promise.allSettled([
        fetchMarketState(),
        fetchPerformanceSummary(),
      ]);

      if (marketResult.status === "rejected") throw marketResult.reason;
      setData(marketResult.value);

      if (performanceResult.status === "fulfilled") {
        setPerformance(performanceResult.value);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load market state");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 60_000);
    return () => clearInterval(id);
  }, []);

  const performanceMap = useMemo(
    () =>
      new Map(
        performance.map((row) => [
          `${row.asset.toUpperCase()}-${row.horizon_h}`,
          row,
        ])
      ),
    [performance]
  );

  const visibleAssets = useMemo(() => {
    return (data?.assets ?? [])
      .filter((item) => item.visible !== false)
      .filter((item) => !HIDDEN_SYMBOLS.has(getAssetSymbol(item)))
      .filter((item) => {
        const key = getAssetKey(item);
        return FREE_KEYS.has(key) || PRO_KEYS.has(key);
      })
      .map((item) => normalizeAsset(item, performanceMap))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier === "Free" ? -1 : 1;
        return a.key.localeCompare(b.key);
      });
  }, [data?.assets, performanceMap]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="font-bold text-zinc-300">Loading market engine...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-red-300">API connection problem</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-zinc-400">{error}</Text>
        <Text className="mt-3 text-center text-xs text-zinc-500">{API_BASE}</Text>
        <Pressable
          onPress={() => load(true)}
          className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3"
        >
          <Text className="font-black text-emerald-300">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={Platform.OS === "web" ? ({ height: "100vh" } as any) : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#34d399"
          />
        }
      >
        <View className="mb-6">
          <View className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
            <Text className="text-xs font-black uppercase tracking-[2px] text-emerald-300">
              Public beta
            </Text>
          </View>

          <Text className="mt-4 text-xs font-bold uppercase tracking-[4px] text-emerald-400">
            AI Market Expert
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Cross-Asset Bias, Sentiment & Probabilistic Forecasts
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Live FX intelligence combining currency strength, yields, equities,
            volatility, risk regime and model-based direction/range forecasts.
          </Text>
          <Text className="mt-4 text-xs text-zinc-500">
            Market data: {data.marketDataTimeBelgrade ?? data.timeBelgrade}
          </Text>
        </View>

        <Card className="mb-6 border-sky-500/30 bg-sky-500/10">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-sky-300">
            Update schedule
          </Text>
          <Text className="mt-2 text-xl font-black text-white">
            Models and cross-asset state refresh hourly
          </Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-300">
            During stabilization, each newly closed market hour produces fresh
            predictions, currency strength, volatility, rates pressure and regime
            analysis. Weekend data remains at the latest valid market close.
          </Text>
        </Card>

        <Card className="mb-6">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-400">
            Active regime
          </Text>
          <Text className="mt-2 text-2xl font-black text-white">
            {data.regimeLabel ?? data.activeRegime}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-300">
            {data.regimeExplanation ?? "Cross-asset state currently available."}
          </Text>
          <View className="mt-4 flex-row gap-2">
            <SmallMetric
              label="Risk score"
              value={
                typeof data.riskScore === "number"
                  ? `${Math.round(data.riskScore)}%`
                  : "N/A"
              }
            />
            <SmallMetric label="Refresh" value="Hourly" />
          </View>
        </Card>

        <SectionTitle
          kicker="Predictions"
          title="Live model assets"
          subtitle="Gold is hidden while its live direction edge remains weak. GBPAUD appears automatically whenever its backend model exists."
        />

        {visibleAssets.length ? (
          visibleAssets.map((item) => <AssetCard key={item.key} item={item} />)
        ) : (
          <Card className="mb-6">
            <Text className="text-lg font-black text-white">No validated public models</Text>
          </Card>
        )}

        <SectionTitle
          kicker="Cross-asset"
          title="Market drivers"
          subtitle="Equities, volatility, USD, JPY, rates, metals and composite risk appetite."
        />
        {data.drivers.map((item) => <DriverCard key={item.key} item={item} />)}

        <SectionTitle
          kicker="FX"
          title="Currency strength"
          subtitle="Relative strength calculated from the live FX cross matrix."
        />
        {data.currencyStrength.map((item, index) => (
          <CurrencyRow key={item.code} item={item} index={index} />
        ))}

        <Card className="mt-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">Disclaimer</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            {data.disclaimer ??
              "Research and educational market-intelligence output. Not financial advice. Live samples remain small and may vary materially across regimes."}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
