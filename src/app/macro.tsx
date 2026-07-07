import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  CurrencyStrengthItem,
  fetchMarketState,
  MarketDriver,
  MarketState,
} from "../services/api";

import {
  fetchMacroLatest,
  fetchMacroSeries,
  MacroSeriesPoint,
} from "../services/macroApi";

import {
  MacroSeriesCard,
} from "../components/MacroSeriesCard";

type MacroTheme =
  | "bullish"
  | "bearish"
  | "neutral";

type ExplainerItem = {
  title: string;
  theme: MacroTheme;
  body: string;
  marketMeaning: string;
  currencyBias: string;
  watch: string[];
};

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

function pct(value?: number | null, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

function scoreText(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${Math.round(value)}/100`;
}

function themeClasses(theme: MacroTheme) {
  if (theme === "bullish") {
    return {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      label: "Supportive",
    };
  }

  if (theme === "bearish") {
    return {
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      text: "text-red-300",
      label: "Pressure",
    };
  }

  return {
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    label: "Mixed",
  };
}

function inferThemeFromState(state?: string): MacroTheme {
  const value = String(state ?? "").toLowerCase();

  if (
    value.includes("risk-on") ||
    value.includes("bid") ||
    value.includes("strong") ||
    value.includes("constructive") ||
    value.includes("contained")
  ) {
    return "bullish";
  }

  if (
    value.includes("risk-off") ||
    value.includes("defensive") ||
    value.includes("weak") ||
    value.includes("elevated") ||
    value.includes("pressure")
  ) {
    return "bearish";
  }

  return "neutral";
}

function getDriverExplanation(driver: MarketDriver): ExplainerItem {
  const text = `${driver.key} ${driver.title} ${driver.state}`.toLowerCase();
  const theme = inferThemeFromState(driver.state);

  if (text.includes("rate") || text.includes("yield")) {
    return {
      title: "Rates and yield pressure",
      theme,
      body:
        "Yield pressure tracks how government-bond pricing is changing intraday. Rising yield pressure can mean the market is repricing tighter policy, stronger growth, inflation risk, or heavier bond selling. Falling pressure can mean easier policy expectations, defensive bond demand, or growth fear.",
      marketMeaning:
        "Rates are one of the main channels through which macro expectations become FX pressure. Currencies often react when their local yield curve becomes more or less attractive versus another region.",
      currencyBias:
        "Higher relative yields can support a currency if the move is orderly. If yields rise because of stress, debt concern or risk-off liquidation, the signal becomes more conflicted.",
      watch: [
        "2y versus 10y curve: policy expectations versus growth expectations.",
        "US yields versus EU/JP/UK yields: relative-rate advantage.",
        "Fast yield spikes with equity weakness: stress, not healthy strength.",
      ],
    };
  }

  if (text.includes("metal") || text.includes("gold") || text.includes("xau")) {
    return {
      title: "Metals pressure",
      theme,
      body:
        "Metals pressure summarizes whether precious metals are being bid or sold relative to the wider market. Gold often reacts to real-rate expectations, USD strength, geopolitical stress and defensive demand.",
      marketMeaning:
        "When metals rise while equities weaken, the market may be looking for safety. When metals fall while yields and USD rise, real-rate pressure may be dominating.",
      currencyBias:
        "A strong USD plus weak metals can pressure AUD and gold-linked risk sentiment. A defensive gold bid can warn that risk appetite is fragile.",
      watch: [
        "Gold up + yields down: defensive or lower-real-rate setup.",
        "Gold down + USD up: USD/rates pressure dominating.",
        "Gold up + equities up: liquidity/risk-on inflation hedge rather than pure fear.",
      ],
    };
  }

  if (text.includes("vol") || text.includes("vix")) {
    return {
      title: "Volatility regime",
      theme,
      body:
        "Volatility measures how much uncertainty the market is pricing. Rising volatility usually means traders demand protection and reduce risky exposure. Falling volatility often supports carry trades, equities and risk currencies.",
      marketMeaning:
        "Volatility is not direction by itself. It tells you whether the environment rewards risk-taking or forces position reduction.",
      currencyBias:
        "Elevated volatility often supports USD and JPY as defensive currencies. Low volatility can support carry and higher-beta FX like AUD, NZD and some GBP crosses.",
      watch: [
        "Vol rising while equities fall: classic risk-off.",
        "Vol falling while equities rise: risk-on confirmation.",
        "Vol high but USD weak: market may be trading a specific US shock, not generic fear.",
      ],
    };
  }

  if (text.includes("equity") || text.includes("equities") || text.includes("risk")) {
    return {
      title: "Risk appetite and equities",
      theme,
      body:
        "Risk appetite measures whether capital is moving toward growth-sensitive assets or defensive assets. Equities, credit-sensitive proxies and volatility together help classify the market as risk-on, risk-off or mixed.",
      marketMeaning:
        "FX does not move only from local news. A pair can move because global capital is rotating toward or away from risk.",
      currencyBias:
        "Risk-on usually supports AUD, NZD and some GBP exposure. Risk-off often supports USD, JPY and CHF, depending on the source of stress.",
      watch: [
        "Equities up + vol down: healthier risk-on.",
        "Equities down + JPY strong: defensive flow.",
        "Equities up but yields spike hard: risk-on may be unstable.",
      ],
    };
  }

  if (text.includes("jpy") || text.includes("haven")) {
    return {
      title: "JPY haven flow",
      theme,
      body:
        "JPY often behaves as a defensive currency when global risk appetite deteriorates. It can strengthen when investors reduce carry trades or seek safer/liquid funding currencies.",
      marketMeaning:
        "JPY strength during equity weakness can confirm risk-off. JPY weakness during calm markets can reflect carry demand and relative-rate pressure.",
      currencyBias:
        "Risk-off tends to support JPY. Higher global yields and risk-on carry appetite tend to pressure JPY, especially versus USD, GBP and AUD.",
      watch: [
        "USDJPY down while equities fall: haven JPY bid.",
        "USDJPY up while US yields rise: rates pressure dominates.",
        "JPY weak across crosses: carry appetite likely active.",
      ],
    };
  }

  if (text.includes("usd") || text.includes("dollar")) {
    return {
      title: "US dollar pressure",
      theme,
      body:
        "USD pressure combines rate expectations, risk demand, liquidity demand and relative US macro strength. The dollar can rise because the US looks stronger, or because the world looks worse. Those are not the same thing, because humans enjoy making one ticker mean five things.",
      marketMeaning:
        "A broad USD bid can dominate individual pair stories. EURUSD, GBPUSD, AUDUSD and XAUUSD often react strongly when USD pressure changes.",
      currencyBias:
        "USD strength is bearish for XXXUSD pairs like EURUSD, GBPUSD and AUDUSD. USD weakness is supportive for those pairs, but only if local currency conditions are not worse.",
      watch: [
        "USD up + yields up: rate advantage / policy repricing.",
        "USD up + equities down: defensive dollar demand.",
        "USD down + metals up: dollar pressure easing.",
      ],
    };
  }

  return {
    title: driver.title,
    theme,
    body:
      "This driver is part of the cross-asset state used to describe the current environment. Its value should be interpreted together with rates, equities, volatility, metals and currency strength.",
    marketMeaning:
      "One driver alone is rarely enough. The useful signal comes from whether several drivers point in the same direction or contradict each other.",
    currencyBias:
      "When driver alignment is strong, model confidence deserves more attention. When drivers conflict, the correct stance is usually caution.",
    watch: [
      "Is this driver aligned with the active regime?",
      "Is it confirmed by currency strength?",
      "Is it contradicted by volatility or yields?",
    ],
  };
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
      <Text className="mb-2 text-xs font-black uppercase tracking-[3px] text-emerald-400">
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

function DriverExplainerCard({ driver }: { driver: MarketDriver }) {
  const explanation = getDriverExplanation(driver);
  const classes = themeClasses(explanation.theme);

  return (
    <Card className={`mb-4 ${classes.border} ${classes.bg}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-black uppercase tracking-[3px] text-zinc-400">
            {driver.title}
          </Text>
          <Text className="mt-2 text-xl font-black text-white">
            {explanation.title}
          </Text>
        </View>
        <View className={`rounded-full border px-3 py-1 ${classes.border} ${classes.bg}`}>
          <Text className={`text-xs font-black ${classes.text}`}>
            {explanation.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-black/30 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            State
          </Text>
          <Text className={`mt-1 text-base font-black ${classes.text}`}>
            {driver.state}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-black/30 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Score
          </Text>
          <Text className="mt-1 text-base font-black text-white">
            {scoreText(driver.score)}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-sm leading-6 text-zinc-300">
        {explanation.body}
      </Text>

      <View className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-xs font-black uppercase tracking-[2px] text-sky-300">
          What it means
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          {explanation.marketMeaning}
        </Text>
      </View>

      <View className="mt-3 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-xs font-black uppercase tracking-[2px] text-violet-300">
          FX bias logic
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          {explanation.currencyBias}
        </Text>
      </View>

      <View className="mt-4">
        {explanation.watch.map((item) => (
          <View key={item} className="mb-2 flex-row items-start">
            <Text className="mr-2 text-emerald-300">•</Text>
            <Text className="flex-1 text-sm leading-6 text-zinc-400">
              {item}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function CurrencyPressureCard({ item }: { item: CurrencyStrengthItem }) {
  const isStrong = item.score >= 65;
  const isWeak = item.score <= 35;
  const color = isStrong
    ? "text-emerald-300"
    : isWeak
    ? "text-red-300"
    : "text-sky-300";

  return (
    <Card className="mb-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-black text-white">
            {item.code}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">
            {item.name}
          </Text>
        </View>
        <Text className={`text-2xl font-black ${color}`}>
          {Math.round(item.score)}
        </Text>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <View
          className={
            isStrong
              ? "h-2 rounded-full bg-emerald-400"
              : isWeak
              ? "h-2 rounded-full bg-red-400"
              : "h-2 rounded-full bg-sky-400"
          }
          style={{ width: `${Math.max(4, Math.min(100, Math.round(item.score)))}%` }}
        />
      </View>

      <Text className="mt-3 text-sm leading-6 text-zinc-400">
        {item.note}
      </Text>
    </Card>
  );
}

function UsMacroPlaceholder() {
  return (
    <Card className="mb-5 border-yellow-500/30 bg-yellow-500/10">
      <Text className="text-xs font-black uppercase tracking-[3px] text-yellow-300">
        US macro history
      </Text>
      <Text className="mt-3 text-xl font-black text-white">
        CPI, labour market, inflation expectations and yields need one backend upload step
      </Text>
      <Text className="mt-3 text-sm leading-6 text-zinc-300">
        The frontend is ready for a two-year macro dashboard, but CPI/NFP-style series must be uploaded to Supabase first. The app cannot draw a serious chart from data that does not exist in the API, shocking as this may be to the spreadsheet spirits.
      </Text>
      <View className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-sm font-black text-white">
          Backend payload needed next
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          macro_series rows: indicator, date, value, previous_value, change, source, updated_at. Then the frontend can show last 2 years, latest release, previous release and whether the new print was hotter/cooler.
        </Text>
      </View>
    </Card>
  );
}

function groupLatestByCategory(rows: MacroSeriesPoint[]) {
  const grouped: Record<string, MacroSeriesPoint[]> = {};

  for (const row of rows) {
    const key = row.category ?? "macro";
    grouped[key] ??= [];
    grouped[key].push(row);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort(
      (a, b) =>
        (b.importance ?? 0) -
        (a.importance ?? 0)
    );
  }

  return grouped;
}

function pickTopSeries(
  series: MacroSeriesPoint[],
  category: string,
  limit = 2
) {
  const byIndicator =
    new Map<string, MacroSeriesPoint[]>();

  for (const point of series.filter(
    (p) => p.category === category
  )) {
    const arr =
      byIndicator.get(
        point.indicator_key
      ) ?? [];

    arr.push(point);

    byIndicator.set(
      point.indicator_key,
      arr
    );
  }

  return [...byIndicator.values()]
    .map((points) =>
      points.sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    )
    .sort(
      (a, b) =>
        (b[b.length - 1]?.importance ?? 0) -
        (a[a.length - 1]?.importance ?? 0)
    )
    .slice(0, limit);
}

function formatMacroValue(
  value?: number | null,
  unit?: string | null
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  const digits =
    Math.abs(value) >= 100
      ? 2
      : 3;

  return `${value.toFixed(digits)}${unit === "%" ? "%" : ""}`;
}

function categoryTitle(category: string) {
  if (category === "inflation") {
    return "Inflation";
  }

  if (category === "labor_market") {
    return "Labour market";
  }

  if (category === "inflation_expectations") {
    return "Inflation expectations";
  }

  if (category === "treasury_yields") {
    return "Treasury yields";
  }

  return category.replace(/_/g, " ");
}

function macroLabelClass(row: MacroSeriesPoint) {
  const text = `${row.interpretation_label ?? ""} ${row.bias_for_usd ?? ""}`.toLowerCase();

  if (
    text.includes("hotter") ||
    text.includes("higher") ||
    text.includes("supportive")
  ) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (
    text.includes("cooler") ||
    text.includes("lower") ||
    text.includes("headwind")
  ) {
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function LatestMacroRow({
  row,
}: {
  row: MacroSeriesPoint;
}) {
  const cls = macroLabelClass(row);
  const textClass =
    cls.split(" ").find((x) =>
      x.startsWith("text-")
    ) ?? "text-zinc-300";

  return (
    <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="font-black text-white">
            {row.indicator_label}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">
            {row.date}
          </Text>
        </View>

        <View className={`rounded-full border px-3 py-1 ${cls}`}>
          <Text className={`text-xs font-black ${textClass}`}>
            {row.interpretation_label ?? "Latest"}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-black/30 p-3">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Latest
          </Text>
          <Text className="mt-1 text-sm font-black text-white">
            {formatMacroValue(row.value, row.unit)}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-black/30 p-3">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Previous
          </Text>
          <Text className="mt-1 text-sm font-black text-zinc-200">
            {formatMacroValue(row.previous_value, row.unit)}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-black/30 p-3">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Change
          </Text>
          <Text className="mt-1 text-sm font-black text-sky-300">
            {typeof row.delta === "number"
              ? `${row.delta >= 0 ? "+" : ""}${formatMacroValue(row.delta, row.unit)}`
              : "N/A"}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm leading-6 text-zinc-400">
        {row.interpretation ??
          "No interpretation available yet."}
      </Text>
    </View>
  );
}

function MacroLatestCategoryCard({
  category,
  rows,
}: {
  category: string;
  rows: MacroSeriesPoint[];
}) {
  return (
    <Card className="mb-5">
      <Text className="text-xs font-black uppercase tracking-[3px] text-zinc-500">
        {categoryTitle(category)}
      </Text>

      {rows.slice(0, 5).map((row) => (
        <LatestMacroRow
          key={row.indicator_key}
          row={row}
        />
      ))}
    </Card>
  );
}

function MacroChartSection({
  title,
  subtitle,
  charts,
}: {
  title: string;
  subtitle: string;
  charts: MacroSeriesPoint[][];
}) {
  if (!charts.length) {
    return null;
  }

  return (
    <View className="mb-2">
      <Text className="mb-2 text-xl font-black text-white">
        {title}
      </Text>
      <Text className="mb-4 text-sm leading-6 text-zinc-400">
        {subtitle}
      </Text>

      {charts.map((points) => (
        <MacroSeriesCard
          key={points[0]?.indicator_key}
          points={points}
        />
      ))}
    </View>
  );
}

export default function MacroScreen() {
  const [data, setData] = useState<MarketState | null>(null);
  const [macroLatest, setMacroLatest] = useState<MacroSeriesPoint[]>([]);
  const [macroSeries, setMacroSeries] = useState<MacroSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setError(null);

      const [
        marketResult,
        latestResult,
        seriesResult,
      ] = await Promise.allSettled([
        fetchMarketState(),
        fetchMacroLatest(40),
        fetchMacroSeries({ limit: 5000 }),
      ]);

      if (marketResult.status === "fulfilled") {
        setData(marketResult.value);
      }

      if (latestResult.status === "fulfilled") {
        setMacroLatest(latestResult.value);
      }

      if (seriesResult.status === "fulfilled") {
        setMacroSeries(seriesResult.value);
      }

      if (
        marketResult.status === "rejected" &&
        latestResult.status === "rejected"
      ) {
        throw marketResult.reason;
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load macro dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const topCurrencies = useMemo(() => {
    return [...(data?.currencyStrength ?? [])]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 4);
  }, [data?.currencyStrength]);

  const weakCurrencies = useMemo(() => {
    return [...(data?.currencyStrength ?? [])]
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 4);
  }, [data?.currencyStrength]);

  const latestByCategory = useMemo(
    () => groupLatestByCategory(macroLatest),
    [macroLatest]
  );

  const inflationCharts = useMemo(
    () => pickTopSeries(macroSeries, "inflation", 3),
    [macroSeries]
  );

  const laborCharts = useMemo(
    () => pickTopSeries(macroSeries, "labor_market", 2),
    [macroSeries]
  );

  const expectationsCharts = useMemo(
    () => pickTopSeries(macroSeries, "inflation_expectations", 3),
    [macroSeries]
  );

  const yieldCharts = useMemo(
    () => pickTopSeries(macroSeries, "treasury_yields", 4),
    [macroSeries]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#34d399" />
        <Text className="mt-3 font-bold text-zinc-300">
          Loading macro intelligence...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-red-300">
          Macro dashboard unavailable
        </Text>
        <Text className="mt-3 text-center text-sm leading-6 text-zinc-400">
          {error}
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
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 active:opacity-70"
        >
          <Text className="font-bold text-zinc-300">
            ← Back to dashboard
          </Text>
        </Pressable>

        <View className="mb-7">
          <Text className="text-xs font-black uppercase tracking-[4px] text-emerald-400">
            Macro intelligence
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            The fundamental picture behind the model signals
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            This page translates rates, curve pressure, risk appetite, volatility,
            metals, JPY haven flow and currency strength into plain market logic.
          </Text>
        </View>

        <Card className="mb-5 border-emerald-500/30 bg-emerald-500/10">
          <Text className="text-xs font-black uppercase tracking-[3px] text-emerald-300">
            Active regime
          </Text>
          <Text className="mt-3 text-2xl font-black text-white">
            {data.regimeLabel ?? data.activeRegime}
          </Text>
          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 rounded-2xl bg-black/30 p-4">
              <Text className="text-xs uppercase tracking-wider text-zinc-500">
                Risk score
              </Text>
              <Text className="mt-1 text-xl font-black text-white">
                {typeof data.riskScore === "number" ? `${Math.round(data.riskScore)}%` : "N/A"}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-black/30 p-4">
              <Text className="text-xs uppercase tracking-wider text-zinc-500">
                Confidence
              </Text>
              <Text className="mt-1 text-xl font-black text-white">
                {pct(data.regimeConfidence, 0)}
              </Text>
            </View>
          </View>
          <Text className="mt-4 text-sm leading-6 text-zinc-300">
            {data.regimeExplanation ?? "The active regime combines risk appetite, rates, volatility, metals and currency strength into one market-state read."}
          </Text>
        </Card>

        <SectionTitle
          kicker="US macro"
          title="Economic data dashboard"
          subtitle="CPI, labour-market data, inflation expectations and treasury yields are shown as two-year series with latest print versus previous print."
        />

        {macroLatest.length ? (
          <>
            <Card className="mb-5 border-sky-500/30 bg-sky-500/10">
              <Text className="text-xs font-black uppercase tracking-[3px] text-sky-300">
                How to read the macro cards
              </Text>
              <Text className="mt-3 text-xl font-black text-white">
                Hotter/cooler is context, not a trading signal by itself
              </Text>
              <Text className="mt-3 text-sm leading-6 text-zinc-300">
                A hotter inflation or labour print can support USD if it keeps policy expectations tighter. Cooler inflation or softer labour data can reduce USD rate support and help risk appetite. Treasury yields show how the market is pricing that story in real time. One print is never enough; the useful read comes from whether inflation, labour, yields, risk appetite and model direction agree.
              </Text>
            </Card>

            {Object.entries(latestByCategory).map(
              ([category, rows]) => (
                <MacroLatestCategoryCard
                  key={category}
                  category={category}
                  rows={rows}
                />
              )
            )}
          </>
        ) : (
          <UsMacroPlaceholder />
        )}

        {macroSeries.length ? (
          <>
            <SectionTitle
              kicker="Macro charts"
              title="Last two years by indicator"
              subtitle="Each chart shows the raw series and explains the latest print against the previous observation. The point is not prediction theater; it is regime awareness."
            />

            <MacroChartSection
              title="Inflation"
              subtitle="CPI, core CPI, PCE and related inflation pressure. Hotter prints can keep the Fed tighter; cooler prints can reduce USD rate support."
              charts={inflationCharts}
            />

            <MacroChartSection
              title="Labour market"
              subtitle="Unemployment, participation, job openings and wage pressure. Strong labour data can support USD via tighter-policy expectations, but overheating can also stress risk assets."
              charts={laborCharts}
            />

            <MacroChartSection
              title="Inflation expectations"
              subtitle="Market/model expectation measures help show whether inflation pressure is becoming embedded or fading."
              charts={expectationsCharts}
            />

            <MacroChartSection
              title="Treasury yields"
              subtitle="Yield moves are the live transmission channel from macro expectations into USD pressure, risk appetite and cross-asset repricing."
              charts={yieldCharts}
            />
          </>
        ) : null}

        <SectionTitle
          kicker="Rates and drivers"
          title="What the live cross-asset state means"
          subtitle="Each card explains the driver, why it matters, how it can affect currencies and what to watch next."
        />

        {data.drivers.map((driver) => (
          <DriverExplainerCard
            key={`${driver.key}-${driver.title}`}
            driver={driver}
          />
        ))}

        <SectionTitle
          kicker="FX strength"
          title="Where capital appears strongest and weakest"
          subtitle="Currency strength helps separate a pair-specific move from a broader currency flow."
        />

        <View className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <Text className="text-xs font-black uppercase tracking-[3px] text-emerald-300">
            Strongest currencies
          </Text>
          <View className="mt-4">
            {topCurrencies.map((item) => (
              <CurrencyPressureCard key={item.code} item={item} />
            ))}
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <Text className="text-xs font-black uppercase tracking-[3px] text-red-300">
            Weakest currencies
          </Text>
          <View className="mt-4">
            {weakCurrencies.map((item) => (
              <CurrencyPressureCard key={item.code} item={item} />
            ))}
          </View>
        </View>

        <Card className="mt-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            How to use this page
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            First read the regime. Then check whether rates, volatility, equities,
            metals and currency strength agree. A model signal is more useful when
            it is supported by the environment. When the macro picture conflicts,
            position sizing and patience matter more than heroic button-clicking,
            despite humanity’s long war against patience.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

