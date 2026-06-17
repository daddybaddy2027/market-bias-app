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
  getAssetSymbol,
} from "../services/api";

import { useAuth } from "../providers/AuthProvider";

import {
  ENABLE_PRO_LOCKS,
  getModelTier,
  isFreeDriver,
  isModelLocked,
  isModelPubliclyAllowed
} from "../config/access";

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

const PRO_MODEL_PREVIEWS = [
  {
    symbol: "EURJPY",
    horizonH: 12,
    display: "Euro / Japanese Yen",
    modelFamily: "legacy_jpy_12h",
  },
  {
    symbol: "EURUSD",
    horizonH: 3,
    display: "Euro / US Dollar",
    modelFamily: "prod_v1",
  },
  {
    symbol: "GBPAUD",
    horizonH: 3,
    display: "British Pound / Australian Dollar",
    modelFamily: "prod_v1",
  },
] as const;

function makeLockedPreview(
  item: (typeof PRO_MODEL_PREVIEWS)[number]
): CardAsset {
  return {
    key: `${item.symbol}-${item.horizonH}`,
    routeSymbol: `${item.symbol}-${item.horizonH}h`,
    symbol: `${item.symbol} ${item.horizonH}h`,
    display: item.display,
    horizonH: item.horizonH,
    bias: "Neutral",
    confidence: 0,
    expectedMove: "Unlock Pro",
    expectedRange: "Hidden",
    status: "Pro model",
    explanation:
      "This model is available to active Pro accounts. Free users can see that the model exists, but its current output and verified history remain protected by database access rules.",
    drivers: [],
    modelFamily: item.modelFamily,
    tier: "Pro",
    locked: true,
    liveAccuracy: null,
    accuracyN: 0,
  };
}

function pct(
  value?: number | null,
  digits = 0
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

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
    value.includes("elevated") ||
    value.includes("pressure")
  ) {
    return "text-red-300";
  }

  return "text-zinc-300";
}

function getConfidence(item: ApiAsset) {
  if (
    typeof item.confidence === "number" &&
    Number.isFinite(item.confidence)
  ) {
    return item.confidence;
  }

  if (item.confidence_label === "high") {
    return 0.75;
  }

  if (item.confidence_label === "medium") {
    return 0.5;
  }

  if (item.confidence_label === "normal") {
    return 0.35;
  }

  return 0;
}

function normalizeAsset(
  item: ApiAsset,
  summaryMap: Map<string, PerformanceSummaryRow>,
  userIsPro: boolean
): CardAsset {
  const symbol = getAssetSymbol(item);
  const horizonH = item.horizon_h ?? 12;
  const key = `${symbol}-${horizonH}`;
  const summary = summaryMap.get(key);
  const tier = getModelTier(symbol, horizonH);

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
    status:
      item.status ??
      item.signal_strength ??
      "Model read",
    explanation:
      item.explanation?.trim() ||
      `${symbol} ${horizonH}h probabilistic live model output. Models and cross-asset state currently refresh every closed market hour.`,
    drivers: item.drivers ?? [],
    modelFamily:
      item.model_family ??
      item.source ??
      "model",
    tier,
    locked: isModelLocked(
      symbol,
      horizonH,
      userIsPro
    ),
    liveAccuracy:
      typeof summary?.direction_accuracy ===
      "number"
        ? summary.direction_accuracy
        : null,
    accuracyN:
      summary?.direction_predictions ?? 0,
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

      <Text
        className={`mt-1 text-base font-bold ${valueClassName}`}
      >
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const width = Math.max(
    4,
    Math.min(100, Math.round(value * 100))
  );

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

      <Text className="text-2xl font-black text-white">
        {title}
      </Text>

      <Text className="mt-2 text-sm leading-6 text-zinc-400">
        {subtitle}
      </Text>
    </View>
  );
}

function IntroCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start">
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <Text className="font-black text-emerald-300">
            {number}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-lg font-black text-white">
            {title}
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            {body}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function AssetCard({
  item,
}: {
  item: CardAsset;
}) {
  const classes = getBiasClasses(
    item.bias
  );

  function openCard() {
    if (item.locked) {
      router.push("/pricing" as never);
      return;
    }

    router.push(
      `/asset/${item.routeSymbol}` as never
    );
  }

  return (
    <Pressable
      onPress={openCard}
      className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 active:opacity-70"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-black text-white">
            {item.symbol}
          </Text>

          <Text className="mt-1 text-sm text-zinc-500">
            {item.display} · {item.modelFamily}
          </Text>
        </View>

        <View className="items-end gap-2">
          <View
            className={`rounded-full border px-3 py-1 ${classes.bg} ${classes.border}`}
          >
            <Text
              className={`text-xs font-black ${
                item.locked
                  ? "text-violet-300"
                  : classes.text
              }`}
            >
              {item.locked
                ? "PRO LOCKED"
                : item.bias}
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
                item.tier === "Free"
                  ? "text-emerald-300"
                  : "text-violet-300"
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
          value={
            item.locked
              ? "Unlock Pro"
              : item.expectedMove
          }
          valueClassName={
            item.locked
              ? "text-violet-300"
              : classes.text
          }
        />

        <SmallMetric
          label={`${item.horizonH}h range`}
          value={
            item.locked
              ? "Hidden"
              : item.expectedRange
          }
        />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric
          label="Live accuracy"
          value={
            item.locked
              ? "Pro history"
              : item.liveAccuracy === null
              ? "Collecting"
              : `${pct(
                  item.liveAccuracy,
                  1
                )} · n=${item.accuracyN}`
          }
        />

        <SmallMetric
          label="Confidence"
          value={
            item.locked
              ? "Hidden"
              : pct(item.confidence)
          }
        />
      </View>

      {!item.locked ? (
        <>
          <ProgressBar
            value={item.confidence}
          />

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
            {item.drivers.map(
              (driver) => (
                <View
                  key={driver}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1"
                >
                  <Text className="text-xs font-semibold text-zinc-300">
                    {driver}
                  </Text>
                </View>
              )
            )}
          </View>
        </>
      ) : (
        <View className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
          <Text className="font-black text-violet-300">
            Full model view is part of Pro
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Unlock the current bias, confidence,
            projected zone and complete verified
            prediction history.
          </Text>

          <Text className="mt-3 text-xs font-black uppercase tracking-[2px] text-violet-200">
            View Pro plan →
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function DriverCard({
  item,
  isPro,
}: {
  item: MarketDriver;
  isPro: boolean;
}) {
  const free = isFreeDriver(
    item.key,
    item.title
  );

  if (
    ENABLE_PRO_LOCKS &&
    !free &&
    !isPro
  ) {
    return (
      <Pressable
        onPress={() =>
          router.push(
            "/pricing" as never
          )
        }
        className="mb-3 rounded-3xl border border-violet-500/30 bg-violet-500/10 p-5 active:opacity-70"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-white">
              {item.title}
            </Text>

            <Text className="mt-1 text-sm font-black text-violet-300">
              PRO ANALYSIS
            </Text>
          </View>

          <View className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1">
            <Text className="text-xs font-black text-violet-200">
              LOCKED
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
          <Text className="text-sm leading-6 text-zinc-400">
            Unlock the live state, score and detailed
            cross-asset interpretation for this driver.
          </Text>
        </View>

        <Text className="mt-4 text-xs font-black uppercase tracking-[2px] text-violet-200">
          Explore Pro →
        </Text>
      </Pressable>
    );
  }

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-white">
            {item.title}
          </Text>

          <Text
            className={`mt-1 text-sm font-semibold ${getStateColor(
              item.state
            )}`}
          >
            {item.state}
          </Text>
        </View>

        <Text className="text-lg font-black text-white">
          {pct(item.strength)}
        </Text>
      </View>

      <ProgressBar
        value={item.strength}
      />

      <Text className="mt-3 text-sm leading-6 text-zinc-400">
        {item.detail}
      </Text>
    </Card>
  );
}

function CurrencyRow({
  item,
  index,
}: {
  item: CurrencyStrengthItem;
  index: number;
}) {
  return (
    <View className="mb-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-2xl bg-zinc-900">
            <Text className="font-black text-zinc-300">
              #{index + 1}
            </Text>
          </View>

          <View>
            <Text className="text-lg font-black text-white">
              {item.code}
            </Text>

            <Text className="text-xs text-zinc-500">
              {item.name}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-base font-black text-white">
            {item.score}/100
          </Text>

          <Text className="text-xs text-zinc-500">
            {item.bias}
          </Text>
        </View>
      </View>

      <ProgressBar
        value={item.score / 100}
      />

      <Text className="mt-3 text-sm leading-6 text-zinc-400">
        {item.note}
      </Text>
    </View>
  );
}

function PricingPreview() {
  return (
    <View className="mb-6">
      <SectionTitle
        kicker="Plans"
        title="Free core. Complete Pro picture."
        subtitle="Use the selected free models and core cross-asset drivers without an account. Pro subscriptions are being prepared."
      />

      <View className="gap-3">
        <Card>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xl font-black text-white">
                Free
              </Text>

              <Text className="mt-1 text-sm text-zinc-500">
                2 live models
              </Text>
            </View>

            <Text className="text-2xl font-black text-emerald-300">
              €0
            </Text>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-400">
            Currency strength, active regime,
            equities, volatility, USD, JPY haven,
            GBPJPY 12h and EURUSD 6h.
          </Text>
        </Card>

        <Pressable
          onPress={() =>
            router.push(
              "/pricing" as never
            )
          }
          className="rounded-3xl border border-violet-500/40 bg-violet-500/10 p-5 active:opacity-70"
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xl font-black text-white">
                Pro Beta
              </Text>

              <Text className="mt-1 text-sm text-violet-200">
                Complete market-intelligence layer
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-2xl font-black text-violet-200">
                €9.99
              </Text>

              <Text className="text-xs text-zinc-500">
                / month planned
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-300">
            Complete model set, full verified history,
            yields, metals and detailed risk-appetite
            analysis.
          </Text>

          <Text className="mt-4 text-xs font-black uppercase tracking-[2px] text-violet-200">
            See plan details →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const {
    isAuthenticated,
    isPro,
  } = useAuth();

  const [data, setData] =
    useState<MarketState | null>(
      null
    );

  const [
    performance,
    setPerformance,
  ] = useState<
    PerformanceSummaryRow[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function load(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setError(null);

      const [
        marketResult,
        performanceResult,
      ] = await Promise.allSettled([
        fetchMarketState(),
        fetchPerformanceSummary(),
      ]);

      if (
        marketResult.status ===
        "rejected"
      ) {
        throw marketResult.reason;
      }

      setData(marketResult.value);

      if (
        performanceResult.status ===
        "fulfilled"
      ) {
        setPerformance(
          performanceResult.value
        );
      }
    } catch (err: any) {
      setError(
        err?.message ??
          "Failed to load market state"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();

    const timer = setInterval(
      () => load(),
      60_000
    );

    return () =>
      clearInterval(timer);
  }, [
    isAuthenticated,
    isPro,
  ]);

  const performanceMap =
    useMemo(
      () =>
        new Map(
          performance.map(
            (row) => [
              `${row.asset.toUpperCase()}-${row.horizon_h}`,
              row,
            ]
          )
        ),
      [performance]
    );

  const visibleAssets =
    useMemo(() => {
      const liveAssets =
        (data?.assets ?? [])
          .filter(
            (item) =>
              item.visible !== false
          )
          .filter((item) => {
            const symbol =
              getAssetSymbol(item);

            const horizon =
              item.horizon_h ?? 12;

            return isModelPubliclyAllowed(
              symbol,
              horizon
            );
          })
          .map((item) =>
            normalizeAsset(
              item,
              performanceMap,
              isPro
            )
          );

      if (!isPro) {
        const existingKeys =
          new Set(
            liveAssets.map(
              (item) => item.key
            )
          );

        for (
          const preview of
            PRO_MODEL_PREVIEWS
        ) {
          const key =
            `${preview.symbol}-${preview.horizonH}`;

          if (
            !existingKeys.has(key)
          ) {
            liveAssets.push(
              makeLockedPreview(
                preview
              )
            );
          }
        }
      }

      return liveAssets.sort(
        (a, b) => {
          if (a.tier !== b.tier) {
            return a.tier === "Free"
              ? -1
              : 1;
          }

          return a.key.localeCompare(
            b.key
          );
        }
      );
    }, [
      data?.assets,
      performanceMap,
      isPro,
    ]);

  const modelCounts = useMemo(
    () => ({
      live: visibleAssets.length,
      free: visibleAssets.filter(
        (item) =>
          item.tier === "Free"
      ).length,
      pro: visibleAssets.filter(
        (item) =>
          item.tier === "Pro"
      ).length,
    }),
    [visibleAssets]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="font-bold text-zinc-300">
          Loading market engine...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-red-300">
          Supabase data problem
        </Text>

        <Text className="mt-3 text-center text-sm leading-6 text-zinc-400">
          {error}
        </Text>

        <Text className="mt-3 text-center text-xs text-zinc-500">
          {API_BASE}
        </Text>

        <Pressable
          onPress={() => load(true)}
          className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3"
        >
          <Text className="font-black text-emerald-300">
            Retry
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={
        Platform.OS === "web"
          ? ({ height: "100vh" } as any)
          : undefined
      }
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              load(true)
            }
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
            Markets are not isolated charts. They are
            connected flows of capital moving between
            currencies, equities, volatility, government
            yields, metals and defensive assets.
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
              <Text className="text-xs font-black text-zinc-300">
                {modelCounts.live} live model views
              </Text>
            </View>

            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <Text className="text-xs font-black text-emerald-300">
                {modelCounts.free} Free
              </Text>
            </View>

            <View className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-2">
              <Text className="text-xs font-black text-violet-300">
                {modelCounts.pro} Pro
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap gap-3">
            <Pressable
              onPress={() =>
                router.push(
                  (isAuthenticated
                    ? "/account"
                    : "/login") as never
                )
              }
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 active:opacity-70"
            >
              <Text className="font-black text-emerald-300">
                {isAuthenticated
                  ? isPro
                    ? "Pro account"
                    : "Free account"
                  : "Sign in / Create account"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push("/pricing" as never)
              }
              className="rounded-2xl border border-violet-500/40 bg-violet-500/10 px-5 py-3 active:opacity-70"
            >
              <Text className="font-black text-violet-300">
                View plans
              </Text>
            </Pressable>
          </View>

          <Text className="mt-4 text-xs text-zinc-500">
            Market data:{" "}
            {data.marketDataTimeBelgrade ??
              data.timeBelgrade}
          </Text>
        </View>

        <SectionTitle
          kicker="How it works"
          title="A wider market view before a forecast"
          subtitle="The platform combines model predictions with the environment in which those predictions are being made."
        />

        <IntroCard
          number="1"
          title="Cross-Asset Intelligence"
          body="The models do not analyse a currency pair in isolation. They interpret relative currency strength, equities, volatility, rates, metals and risk appetite as parts of one connected capital-flow system."
        />

        <IntroCard
          number="2"
          title="Probabilistic Models"
          body="Each forecast estimates direction, expected movement and a possible range. The shaded zone is uncertainty, not a promise that price will follow one exact line."
        />

        <IntroCard
          number="3"
          title="High-Impact Event Awareness"
          body="CPI, NFP, central-bank decisions, geopolitical escalation and trade-policy shocks can abruptly change the market regime. After a major event, the rational approach is to let the move settle and evaluate the next model output inside the newly formed environment."
        />

        <Card className="mb-6 border-sky-500/30 bg-sky-500/10">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-sky-300">
            The underlying idea
          </Text>

          <Text className="mt-2 text-xl font-black text-white">
            Fundamentals create pressure. Capital flows express it through price.
          </Text>

          <Text className="mt-3 text-sm leading-6 text-zinc-300">
            Macro fundamentals, positioning, liquidity and
            technical structure influence how capital moves
            between asset classes. Retail trading is not about
            knowing the future with certainty. It is about
            adapting more rationally as the environment changes.
          </Text>
        </Card>

        <Card className="mb-6">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-400">
            Active regime
          </Text>

          <Text className="mt-2 text-2xl font-black text-white">
            {data.regimeLabel ??
              data.activeRegime}
          </Text>

          <View className="mt-4 flex-row gap-2">
            <SmallMetric
              label="Risk score"
              value={
                typeof data.riskScore ===
                "number"
                  ? `${Math.round(
                      data.riskScore
                    )}%`
                  : "N/A"
              }
            />

            <SmallMetric
              label="Refresh"
              value="Hourly"
            />
          </View>

          <View className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
            <Text className="text-sm font-black text-violet-300">
              Detailed regime interpretation is Pro
            </Text>

            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Free users see the current regime and risk
              score. Pro adds the complete cross-asset
              explanation and premium driver breakdown.
            </Text>
          </View>
        </Card>

        <SectionTitle
          kicker="Predictions"
          title="Live model assets"
          subtitle="Selected models remain free. Pro models show their existence while the current bias, projected zone, confidence and full history remain locked."
        />

        {visibleAssets.length ? (
          visibleAssets.map(
            (item) => (
              <AssetCard
                key={item.key}
                item={item}
              />
            )
          )
        ) : (
          <Card className="mb-6">
            <Text className="text-lg font-black text-white">
              No validated public models
            </Text>
          </Card>
        )}

        <SectionTitle
          kicker="Cross-asset"
          title="Market drivers"
          subtitle="Equities, volatility, USD and JPY-haven state remain free. Rates, metals and full risk-appetite decomposition are part of Pro."
        />

        {data.drivers.map(
          (item) => (
            <DriverCard
              key={item.key}
              item={item}
              isPro={isPro}
            />
          )
        )}

        <SectionTitle
          kicker="FX"
          title="Currency strength"
          subtitle="The complete relative-strength ranking remains available to every user."
        />

        {data.currencyStrength.map(
          (item, index) => (
            <CurrencyRow
              key={item.code}
              item={item}
              index={index}
            />
          )
        )}

        <PricingPreview />

        <Card className="mt-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Disclaimer
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            {data.disclaimer ??
              "Research and educational market-intelligence output. Not financial advice. Live samples remain small and may vary materially across regimes. Predictions created before major market shocks should not be interpreted as if the environment remained unchanged."}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

