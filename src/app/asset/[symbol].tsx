import { router, useLocalSearchParams } from "expo-router";
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

type Bias = "Bullish" | "Bearish" | "Neutral";
type TabKey = "chart" | "history";

type ApiAsset = {
  source?: string;
  asset: string;
  symbol?: string;
  display: string;
  time_utc?: string;
  time_belgrade?: string;
  horizon_h?: number;
  session?: string;
  bias: Bias;
  pred_dir?: number;
  pred_mu_12h_ret?: number;
  pred_sigma_12h?: number;
  expectedMove?: string;
  expectedRange?: string;
  currentPrice?: number;
  projectedLow?: number;
  projectedHigh?: number;
  confidence: number;
  signal_strength?: string;
  expert_top?: string;
  expert_profile?: string;
  model_status?: string;
  visible?: boolean;
  status?: string;
  drivers?: string[];
  explanation?: string;
};

type MarketState = {
  generatedAt: string;
  timeBelgrade: string;
  marketDataTimeUTC?: string;
  marketDataTimeBelgrade?: string;
  forecastHorizon: string;
  activeRegime: string;
  regimeLabel?: string;
  riskScore: number;
  drivers: any[];
  currencyStrength: any[];
  assets: ApiAsset[];
};

type PredictionHistoryRow = {
  time_belgrade?: string;
  time_utc?: string;
  asset: string;
  close?: number;
  bias?: Bias | string;
  pred_mu_12h_ret?: number;
  direct_pred_range_12h_ret?: number;
  confidence?: number;
  signal_strength?: string;
  expert_top?: string;
  expert_profile?: string;
};

type PredictionHistoryItem = {
  id: string;
  date: string;
  bias: Bias;
  expectedMove: string;
  expectedRange: string;
  actualMove: string;
  actualRange: string;
  directionResult: "Pending" | "Hit" | "Miss" | "Neutral";
  rangeResult: "Pending" | "Inside range" | "Outside range";
  confidence: number;
};

type AssetDetail = {
  symbol: string;
  display: string;
  modelUsage: "Direction + Range" | "Direction only" | "Range only";
  bias: Bias;
  confidence: number;
  expectedMove: string;
  expectedRange: string;
  expectedVolatility: string;
  projectedLow: string;
  projectedHigh: string;
  currentPrice: string;
  lastSignal: string;
  signalStatus: string;
  directionAccuracy: number;
  rangeHitRate: number;
  totalPredictions: number;
  avgRangeError: string;
  avgMoveError: string;
  explanation: string;
  drivers: string[];
  chartPoints: number[];
  history: PredictionHistoryItem[];
  expertInfo: string;
  source: string;
};

const API_BASE = "http://127.0.0.1:8000";

async function fetchMarketState(): Promise<MarketState> {
  const response = await fetch(`${API_BASE}/api/market-state/latest`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}

async function fetchPredictionHistory(limit = 300): Promise<PredictionHistoryRow[]> {
  const response = await fetch(`${API_BASE}/api/predictions/history?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`History API error ${response.status}`);
  }

  const data = await response.json();
  return data.rows ?? [];
}

function getAssetSymbol(asset: ApiAsset) {
  return asset.symbol ?? asset.asset;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatPrice(value: number | undefined, symbol: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  if (symbol.includes("JPY")) {
    return value.toFixed(3);
  }

  if (symbol.includes("BTC") || symbol.includes("ETH") || symbol === "SPY") {
    return value.toFixed(2);
  }

  return value.toFixed(5);
}

function formatMoveFromNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(4)}%`;
}

function getBiasFromValue(value?: number): Bias {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Neutral";
  }

  if (value > 0) return "Bullish";
  if (value < 0) return "Bearish";
  return "Neutral";
}

function buildChartPoints(item: ApiAsset) {
  const dir = item.pred_dir ?? 0;
  const confidence = Math.max(0.05, Number(item.confidence ?? 0));

  const base = 48;
  const step = Math.max(2, Math.round(confidence * 30));

  if (dir > 0) {
    return [
      base - 8,
      base - 5,
      base - 2,
      base,
      base + 2,
      base + step,
      base + step + 4,
      base + step + 8,
      base + step + 11,
      base + step + 14,
    ];
  }

  if (dir < 0) {
    return [
      base + 14,
      base + 11,
      base + 8,
      base + 4,
      base,
      base - 2,
      base - step,
      base - step - 4,
      base - step - 7,
      base - step - 9,
    ];
  }

  return [45, 47, 46, 48, 47, 46, 48, 47, 49, 48];
}

function normalizeAssetDetail(
  item: ApiAsset,
  historyRows: PredictionHistoryRow[]
): AssetDetail {
  const symbol = getAssetSymbol(item);

  const history = historyRows
    .filter((row) => String(row.asset).toUpperCase() === symbol.toUpperCase())
    .slice(-30)
    .reverse()
    .map((row, index) => {
      const mu = row.pred_mu_12h_ret;
      const range = row.direct_pred_range_12h_ret;

      return {
        id: `${symbol}-${index}-${row.time_belgrade ?? row.time_utc}`,
        date: String(row.time_belgrade ?? row.time_utc ?? "N/A"),
        bias: (row.bias as Bias) ?? getBiasFromValue(mu),
        expectedMove: formatMoveFromNumber(mu),
        expectedRange: formatMoveFromNumber(range),
        actualMove: "Pending",
        actualRange: "Pending",
        directionResult: "Pending" as const,
        rangeResult: "Pending" as const,
        confidence: Number(row.confidence ?? 0),
      };
    });

  const confidence = Number(item.confidence ?? 0);

  return {
    symbol,
    display: item.display ?? symbol,
    modelUsage:
      item.expectedRange && item.expectedRange !== "N/A"
        ? "Direction + Range"
        : "Direction only",
    bias: item.bias ?? "Neutral",
    confidence,
    expectedMove: item.expectedMove ?? "N/A",
    expectedRange: item.expectedRange ?? "N/A",
    expectedVolatility:
      typeof item.pred_sigma_12h === "number" && item.pred_sigma_12h > 0.002
        ? "Elevated"
        : "Moderate",
    projectedLow: formatPrice(item.projectedLow, symbol),
    projectedHigh: formatPrice(item.projectedHigh, symbol),
    currentPrice: formatPrice(item.currentPrice, symbol),
    lastSignal: String(item.time_belgrade ?? item.time_utc ?? "Live model state"),
    signalStatus: item.status ?? item.signal_strength ?? "Model read",
    directionAccuracy: 0,
    rangeHitRate: 0,
    totalPredictions: history.length,
    avgRangeError: "Pending",
    avgMoveError: "Pending",
    explanation:
      item.explanation && item.explanation.length > 0
        ? item.explanation
        : `${symbol} live model output. Direction and range are generated from the current VS/MT5+TVD expert ensemble. This is probabilistic market intelligence, not a trade command from the heavens.`,
    drivers: item.drivers ?? [],
    chartPoints: buildChartPoints(item),
    history,
    expertInfo: `${item.expert_top ?? "expert"} / ${item.expert_profile ?? "profile"}`,
    source: item.source ?? "vs_mt5_tvd",
  };
}

function getBiasClasses(bias: Bias) {
  if (bias === "Bullish") {
    return {
      text: "text-emerald-300",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      bar: "bg-emerald-400",
    };
  }

  if (bias === "Bearish") {
    return {
      text: "text-red-300",
      bg: "bg-red-500/15",
      border: "border-red-500/40",
      bar: "bg-red-400",
    };
  }

  return {
    text: "text-zinc-300",
    bg: "bg-zinc-800",
    border: "border-zinc-700",
    bar: "bg-sky-300",
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

function ProgressBar({
  value,
  tone = "emerald",
}: {
  value: number;
  tone?: "emerald" | "red" | "yellow" | "sky";
}) {
  const width = Math.max(5, Math.min(100, Math.round(value * 100)));

  const color =
    tone === "red"
      ? "bg-red-400"
      : tone === "yellow"
      ? "bg-yellow-300"
      : tone === "sky"
      ? "bg-sky-300"
      : "bg-emerald-400";

  return (
    <View className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
      <View
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-2xl border px-4 py-3 ${
        active
          ? "border-emerald-500/50 bg-emerald-500/15"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <Text
        className={`text-center text-sm font-black ${
          active ? "text-emerald-300" : "text-zinc-400"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProjectionChart({ asset }: { asset: AssetDetail }) {
  const biasClasses = getBiasClasses(asset.bias);
  const points = asset.chartPoints;

  return (
    <Card className="mb-5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xl font-black text-white">
            12h projection chart
          </Text>
          <Text className="mt-1 text-sm text-zinc-500">
            Range / direction visual prototype
          </Text>
        </View>

        <View
          className={`rounded-full border px-3 py-1 ${biasClasses.bg} ${biasClasses.border}`}
        >
          <Text className={`text-xs font-black ${biasClasses.text}`}>
            {asset.bias}
          </Text>
        </View>
      </View>

      <View className="mt-5 h-56 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
        <View className="absolute left-4 right-4 top-8 h-28 rounded-3xl border border-sky-500/30 bg-sky-500/10" />

        <View className="absolute left-5 top-7 rounded-full bg-sky-500/20 px-2 py-1">
          <Text className="text-[10px] font-bold text-sky-300">
            projected range
          </Text>
        </View>

        <View className="absolute bottom-4 left-4 right-4 top-4 flex-row items-end justify-between">
          {points.map((point, index) => {
            const height = Math.max(18, Math.min(150, point * 2.2));

            return (
              <View key={`${point}-${index}`} className="items-center">
                <View
                  className={`w-2 rounded-full ${biasClasses.bar}`}
                  style={{ height }}
                />
                <View className="mt-2 h-1 w-1 rounded-full bg-zinc-500" />
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <SmallMetric label="Current" value={asset.currentPrice} />
        <SmallMetric label="Low" value={asset.projectedLow} />
        <SmallMetric label="High" value={asset.projectedHigh} />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric
          label="Expected move"
          value={asset.expectedMove}
          valueClassName={biasClasses.text}
        />
        <SmallMetric label="12h range" value={asset.expectedRange} />
      </View>
    </Card>
  );
}

function ChartTab({ asset }: { asset: AssetDetail }) {
  const biasClasses = getBiasClasses(asset.bias);

  return (
    <View>
      <ProjectionChart asset={asset} />

      <Card className="mb-5">
        <Text className="text-xl font-black text-white">Prediction logic</Text>

        <View className="mt-4 flex-row gap-2">
          <SmallMetric label="Model usage" value={asset.modelUsage} />
          <SmallMetric
            label="Confidence"
            value={pct(asset.confidence)}
            valueClassName={
              asset.confidence >= 0.7
                ? "text-emerald-300"
                : asset.confidence >= 0.35
                ? "text-yellow-300"
                : "text-zinc-300"
            }
          />
        </View>

        <ProgressBar
          value={asset.confidence}
          tone={
            asset.confidence >= 0.7
              ? "emerald"
              : asset.confidence >= 0.35
              ? "yellow"
              : "sky"
          }
        />

        <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Signal status
          </Text>
          <Text className="mt-1 text-sm font-black text-sky-300">
            {asset.signalStatus}
          </Text>
        </View>

        <Text className="mt-4 text-sm leading-6 text-zinc-400">
          {asset.explanation}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {asset.drivers.map((driver) => (
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
      </Card>

      <Card className="mb-5">
        <Text className="text-xl font-black text-white">Model information</Text>

        <View className="mt-4 flex-row gap-2">
          <SmallMetric label="Expert" value={asset.expertInfo} />
          <SmallMetric label="Source" value={asset.source} />
        </View>

        <View className="mt-2 flex-row gap-2">
          <SmallMetric label="Last signal" value={asset.lastSignal} />
          <SmallMetric label="Predictions" value={String(asset.totalPredictions)} />
        </View>
      </Card>

      <Card className="mb-5">
        <Text className="text-xl font-black text-white">Accuracy tracking</Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-500">
          Real hit/miss tracking will be calculated only after the 12h forecast
          window closes. Until then, history rows are pending. A rare outbreak
          of honesty in trading software.
        </Text>

        <View className="mt-4 flex-row gap-2">
          <SmallMetric label="Direction acc." value="Pending" />
          <SmallMetric label="Range hit rate" value="Pending" />
        </View>

        <View className="mt-2 flex-row gap-2">
          <SmallMetric label="Avg move error" value={asset.avgMoveError} />
          <SmallMetric label="Avg range error" value={asset.avgRangeError} />
        </View>
      </Card>
    </View>
  );
}

function HistoryTab({ asset }: { asset: AssetDetail }) {
  if (!asset.history.length) {
    return (
      <Card className="mb-5">
        <Text className="text-xl font-black text-white">Prediction history</Text>
        <Text className="mt-3 text-sm leading-6 text-zinc-400">
          No saved prediction history for this asset yet. The model has to
          actually live a little before it has memories.
        </Text>
      </Card>
    );
  }

  return (
    <View>
      <Card className="mb-5">
        <Text className="text-xl font-black text-white">Prediction history</Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-500">
          Latest saved model outputs. Actual results are marked pending until
          the 12h horizon closes.
        </Text>
      </Card>

      {asset.history.map((item) => {
        const biasClasses = getBiasClasses(item.bias);

        return (
          <View
            key={item.id}
            className="mb-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-base font-black text-white">
                  {item.date}
                </Text>
                <Text className="mt-1 text-xs text-zinc-500">
                  Confidence {pct(item.confidence)}
                </Text>
              </View>

              <View
                className={`rounded-full border px-3 py-1 ${biasClasses.bg} ${biasClasses.border}`}
              >
                <Text className={`text-xs font-black ${biasClasses.text}`}>
                  {item.bias}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <SmallMetric
                label="Expected move"
                value={item.expectedMove}
                valueClassName={biasClasses.text}
              />
              <SmallMetric label="Expected range" value={item.expectedRange} />
            </View>

            <View className="mt-2 flex-row gap-2">
              <SmallMetric label="Actual move" value={item.actualMove} />
              <SmallMetric label="Actual range" value={item.actualRange} />
            </View>

            <View className="mt-4 flex-row gap-2">
              <View className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <Text className="text-xs uppercase tracking-wider text-zinc-500">
                  Direction
                </Text>
                <Text className="mt-1 text-sm font-black text-yellow-300">
                  {item.directionResult}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <Text className="text-xs uppercase tracking-wider text-zinc-500">
                  Range
                </Text>
                <Text className="mt-1 text-sm font-black text-yellow-300">
                  {item.rangeResult}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function AssetDetailScreen() {
  const params = useLocalSearchParams<{ symbol?: string }>();
  const symbol = String(params.symbol ?? "").toUpperCase();

  const [tab, setTab] = useState<TabKey>("chart");
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [marketTime, setMarketTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setError(null);

      const [marketState, history] = await Promise.all([
        fetchMarketState(),
        fetchPredictionHistory(500),
      ]);

      const apiAsset = marketState.assets.find((item) => {
        const itemSymbol = String(item.asset ?? item.symbol).toUpperCase();
        return itemSymbol === symbol;
      });

      if (!apiAsset) {
        setAsset(null);
        setMarketTime(marketState.marketDataTimeBelgrade ?? marketState.timeBelgrade);
        setError(`No active live model output for ${symbol}.`);
        return;
      }

      setAsset(normalizeAssetDetail(apiAsset, history));
      setMarketTime(marketState.marketDataTimeBelgrade ?? marketState.timeBelgrade);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load asset.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const id = setInterval(() => {
      load();
    }, 60_000);

    return () => clearInterval(id);
  }, [symbol]);

  const biasClasses = useMemo(
    () => getBiasClasses(asset?.bias ?? "Neutral"),
    [asset?.bias]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="font-bold text-zinc-300">Loading asset...</Text>
      </SafeAreaView>
    );
  }

  if (error || !asset) {
    return (
      <SafeAreaView className="flex-1 bg-black px-5 pt-8">
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
        >
          <Text className="font-bold text-zinc-300">← Back</Text>
        </Pressable>

        <Text className="text-2xl font-black text-white">{symbol}</Text>

        <Text className="mt-3 text-sm leading-6 text-zinc-400">
          {error ?? "Asset not found."}
        </Text>

        <Text className="mt-4 text-sm leading-6 text-zinc-500">
          This asset may exist in the app universe, but no validated live model
          output is currently available. The frontend is finally refusing to
          hallucinate a signal. Personal growth, apparently.
        </Text>

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
      style={Platform.OS === "web" ? { height: "100vh" as any } : undefined}
    >
      <ScrollView
        className="flex-1"
        style={Platform.OS === "web" ? { height: "100vh" as any } : undefined}
        contentContainerClassName="px-5 pb-24 pt-4"
        showsVerticalScrollIndicator={true}
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
          <Text className="font-bold text-zinc-300">← Back to dashboard</Text>
        </Pressable>

        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-[4px] text-emerald-400">
            Asset detail
          </Text>

          <View className="mt-4 flex-row items-start justify-between">
            <View>
              <Text className="text-4xl font-black text-white">
                {asset.symbol}
              </Text>
              <Text className="mt-1 text-base text-zinc-500">
                {asset.display}
              </Text>
            </View>

            <View
              className={`rounded-full border px-3 py-1 ${biasClasses.bg} ${biasClasses.border}`}
            >
              <Text className={`text-xs font-black ${biasClasses.text}`}>
                {asset.bias}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-400">
            Market data: {marketTime}
          </Text>
        </View>

        <View className="mb-5 flex-row gap-2">
          <TabButton
            label="Projection"
            active={tab === "chart"}
            onPress={() => setTab("chart")}
          />
          <TabButton
            label="History"
            active={tab === "history"}
            onPress={() => setTab("history")}
          />
        </View>

        {tab === "chart" ? <ChartTab asset={asset} /> : <HistoryTab asset={asset} />}

        <Card className="mt-2">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Disclaimer
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Educational market-intelligence output. Not financial advice.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}


