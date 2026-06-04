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

type Bias = "Bullish" | "Bearish" | "Neutral";

type MarketDriver = {
  key: string;
  title: string;
  state: string;
  score?: number;
  strength: number;
  detail: string;
};

type CurrencyStrengthItem = {
  code: string;
  name: string;
  score: number;
  rank?: number;
  bias: string;
  note: string;
};

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
  regimeConfidence: number;
  confidenceLabel?: string;
  regimeExplanation?: string;
  riskScore: number;

  drivers: MarketDriver[];
  currencyStrength: CurrencyStrengthItem[];
  assets: ApiAsset[];

  dataFreshness?: Record<string, any>;
  sources?: Record<string, any>;
  disclaimer?: string;
};

type CardAsset = {
  symbol: string;
  display: string;
  bias: Bias;
  confidence: number;
  expectedMove: string;
  expectedRange: string;
  volatility: string;
  status: string;
  explanation: string;
  drivers: string[];
  visible: boolean;
  modelStatus: string;
};

type RegimeInfo = {
  title: string;
  label: string;
  tone: "positive" | "negative" | "neutral" | "warning";
  summary: string;
  interpretation: string;
  driverNotes: string[];
};

const API_BASE = "http://127.0.0.1:8000";

const regimeLibrary: Record<string, RegimeInfo> = {
  broad_risk_on: {
    title: "Broad Risk-On",
    label: "Constructive risk appetite",
    tone: "positive",
    summary:
      "Cross-asset conditions are broadly constructive. Equities and higher-beta assets are supported, volatility is contained, and defensive demand is less dominant.",
    interpretation:
      "This regime usually supports cleaner directional follow-through in risk-sensitive assets, provided USD pressure does not override the setup.",
    driverNotes: [
      "Equities supported",
      "Volatility contained",
      "High-beta assets improving",
      "Defensive demand less dominant",
    ],
  },

  constructive_risk: {
    title: "Constructive Risk Appetite",
    label: "Risk appetite improving",
    tone: "positive",
    summary:
      "Risk appetite is constructive, though not necessarily fully aligned across all assets.",
    interpretation:
      "This environment can support risk-sensitive FX and equities, but confirmation from volatility and rates remains important.",
    driverNotes: [
      "Risk appetite constructive",
      "Cross-asset confirmation needed",
      "Watch USD and yields",
      "Higher-beta assets may improve",
    ],
  },

  risk_off_usd_leadership: {
    title: "Risk-Off with USD Leadership",
    label: "Defensive regime, USD as main winner",
    tone: "negative",
    summary:
      "Cross-asset conditions are defensive and USD is receiving the strongest capital support.",
    interpretation:
      "High-beta FX, commodities and crypto can remain vulnerable. EURUSD, GBPUSD and AUDUSD usually become more sensitive to USD pressure.",
    driverNotes: [
      "USD supported",
      "Equities defensive",
      "High-beta FX vulnerable",
      "Liquidity preference rising",
    ],
  },

  risk_off_jpy_haven: {
    title: "Risk-Off with JPY Haven Leadership",
    label: "Defensive regime, JPY haven bid",
    tone: "negative",
    summary:
      "Risk appetite is defensive and JPY is showing haven-style demand.",
    interpretation:
      "Carry-sensitive crosses such as GBPJPY and EURJPY deserve extra caution because deleveraging can dominate normal trend behavior.",
    driverNotes: [
      "JPY haven demand rising",
      "Carry trades vulnerable",
      "Volatility matters",
      "JPY crosses sensitive",
    ],
  },

  broad_risk_off: {
    title: "Broad Risk-Off",
    label: "Defensive market regime",
    tone: "negative",
    summary:
      "Risk appetite is weak across multiple market drivers.",
    interpretation:
      "Direction can become unstable and defensive flows may dominate. Model confidence should be treated more carefully.",
    driverNotes: [
      "Risk appetite weak",
      "Volatility may expand",
      "Defensive assets stronger",
      "Position sizing matters",
    ],
  },

  rates_shock: {
    title: "Rates Shock",
    label: "Yields are the dominant macro driver",
    tone: "warning",
    summary:
      "Rates pressure is elevated and markets are reacting to yield repricing.",
    interpretation:
      "This regime can create fast intraday rotations. USD, equities, gold and JPY can react sharply depending on which region’s yields are leading.",
    driverNotes: [
      "Yields repricing",
      "USD may react strongly",
      "Equities rate-sensitive",
      "Forecast stability can weaken",
    ],
  },

  gold_hedge: {
    title: "Gold Hedge Regime",
    label: "Metals attracting hedge demand",
    tone: "warning",
    summary:
      "Gold or metals proxies are attracting defensive or real-rate-sensitive demand.",
    interpretation:
      "Metals strength can signal macro uncertainty, softer real yields, or defensive hedging depending on the rates backdrop.",
    driverNotes: [
      "Metals bid improving",
      "Macro uncertainty possible",
      "Real-rate sensitivity important",
      "Risk confirmation needed",
    ],
  },

  mixed_market: {
    title: "Mixed Market",
    label: "Signals not fully aligned",
    tone: "neutral",
    summary:
      "Cross-asset signals are mixed. Some markets are pricing caution while others remain stable.",
    interpretation:
      "Directional conviction should be treated as lower. Relative-value setups may be more rational than aggressive directional trades.",
    driverNotes: [
      "Drivers disagree",
      "Lower directional conviction",
      "Relative-value logic preferred",
      "Wait for cleaner alignment",
    ],
  },

  mixed_transition: {
    title: "Mixed or Transition Regime",
    label: "Signals not fully aligned",
    tone: "neutral",
    summary:
      "Cross-asset signals are not fully aligned. The market may be transitioning between regimes.",
    interpretation:
      "Forecast confidence can be lower until equities, yields, USD, volatility and commodities tell the same story.",
    driverNotes: [
      "Market drivers conflicting",
      "Lower directional conviction",
      "Watch for regime shift",
      "Avoid overreading weak signals",
    ],
  },
};

function getAssetSymbol(asset: ApiAsset) {
  return asset.symbol ?? asset.asset;
}

async function fetchMarketState(): Promise<MarketState> {
  const response = await fetch(`${API_BASE}/api/market-state/latest`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function pctFromScore(score: number) {
  return `${Math.round(score)}%`;
}

function getRegimeInfo(key?: string): RegimeInfo {
  if (!key) return regimeLibrary.mixed_transition;

  if (regimeLibrary[key]) {
    return regimeLibrary[key];
  }

  return regimeLibrary.mixed_transition;
}

function getToneClasses(tone: "positive" | "negative" | "neutral" | "warning") {
  if (tone === "positive") {
    return {
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      pill: "bg-emerald-500/15 border-emerald-500/40",
    };
  }

  if (tone === "negative") {
    return {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      text: "text-red-300",
      pill: "bg-red-500/15 border-red-500/40",
    };
  }

  if (tone === "warning") {
    return {
      border: "border-yellow-500/40",
      bg: "bg-yellow-500/10",
      text: "text-yellow-300",
      pill: "bg-yellow-500/15 border-yellow-500/40",
    };
  }

  return {
    border: "border-zinc-700",
    bg: "bg-zinc-900",
    text: "text-zinc-300",
    pill: "bg-zinc-800 border-zinc-700",
  };
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
    text: "text-zinc-300",
    bg: "bg-zinc-800",
    border: "border-zinc-700",
  };
}

function getStateColor(state: string) {
  const s = state.toLowerCase();

  if (
    s.includes("risk-on") ||
    s.includes("strength") ||
    s.includes("firm") ||
    s.includes("constructive") ||
    s.includes("contained") ||
    s.includes("bid")
  ) {
    return "text-emerald-300";
  }

  if (
    s.includes("risk-off") ||
    s.includes("defensive") ||
    s.includes("soft") ||
    s.includes("weak") ||
    s.includes("expanding") ||
    s.includes("pressure up")
  ) {
    return "text-red-300";
  }

  return "text-zinc-300";
}

function normalizeAssetForCard(item: ApiAsset): CardAsset {
  const symbol = getAssetSymbol(item);

  return {
    symbol,
    display: item.display ?? symbol,
    bias: item.bias ?? "Neutral",
    confidence: Number(item.confidence ?? 0),
    expectedMove: item.expectedMove ?? "N/A",
    expectedRange: item.expectedRange ?? "N/A",
    volatility:
      typeof item.pred_sigma_12h === "number" && item.pred_sigma_12h > 0.002
        ? "Elevated"
        : "Moderate",
    status: item.status ?? item.signal_strength ?? "Model read",
    explanation:
      item.explanation && item.explanation.length > 0
        ? item.explanation
        : `${symbol} live model read from ${
            item.source ?? "market engine"
          }. This is a probabilistic 12h estimate, not a trade instruction.`,
    drivers: item.drivers ?? [],
    visible: item.visible ?? true,
    modelStatus: item.model_status ?? "visible",
  };
}

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-4">
      {kicker ? (
        <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-emerald-400">
          {kicker}
        </Text>
      ) : null}
      <Text className="text-2xl font-black text-white">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
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

function DriverCard({ item }: { item: MarketDriver }) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-white">{item.title}</Text>
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
        tone={
          getStateColor(item.state).includes("red")
            ? "red"
            : item.state.toLowerCase().includes("mixed")
            ? "yellow"
            : "emerald"
        }
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
  const tone =
    item.score >= 70
      ? "text-emerald-300"
      : item.score >= 50
      ? "text-yellow-300"
      : "text-red-300";

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
          <Text className={`text-base font-black ${tone}`}>
            {item.score}/100
          </Text>
          <Text className="text-xs text-zinc-500">{item.bias}</Text>
        </View>
      </View>

      <ProgressBar
        value={item.score / 100}
        tone={item.score >= 70 ? "emerald" : item.score >= 50 ? "yellow" : "red"}
      />

      <Text className="mt-3 text-sm leading-6 text-zinc-400">
        {item.note}
      </Text>
    </View>
  );
}

function AssetPredictionCard({ item }: { item: CardAsset }) {
  const biasClasses = getBiasClasses(item.bias);

  return (
    <Pressable
      onPress={() => router.push(`/asset/${item.symbol}` as any)}
      className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 active:opacity-70"
    >
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-2xl font-black text-white">{item.symbol}</Text>
          <Text className="mt-1 text-sm text-zinc-500">{item.display}</Text>
        </View>

        <View
          className={`rounded-full border px-3 py-1 ${biasClasses.bg} ${biasClasses.border}`}
        >
          <Text className={`text-xs font-black ${biasClasses.text}`}>
            {item.bias}
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row gap-2">
        <SmallMetric
          label="Expected move"
          value={item.expectedMove}
          valueClassName={biasClasses.text}
        />
        <SmallMetric label="12h range" value={item.expectedRange} />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric label="Volatility" value={item.volatility} />
        <SmallMetric
          label="Confidence"
          value={pct(item.confidence)}
          valueClassName={
            item.confidence >= 0.7
              ? "text-emerald-300"
              : item.confidence >= 0.35
              ? "text-yellow-300"
              : "text-zinc-300"
          }
        />
      </View>

      <ProgressBar
        value={item.confidence}
        tone={
          item.confidence >= 0.7
            ? "emerald"
            : item.confidence >= 0.35
            ? "yellow"
            : "sky"
        }
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
    </Pressable>
  );
}

export default function HomeScreen() {
  const [data, setData] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMarketState(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setError(null);

      const fresh = await fetchMarketState();
      setData(fresh);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market state");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMarketState();

    const id = setInterval(() => {
      loadMarketState();
    }, 60_000);

    return () => clearInterval(id);
  }, []);

  const activeRegime = useMemo(
    () => getRegimeInfo(data?.activeRegime),
    [data?.activeRegime]
  );

  const toneClasses = getToneClasses(activeRegime.tone);

  const visibleAssets = useMemo(() => {
    return (data?.assets ?? [])
      .filter((item) => item.visible !== false)
      .map(normalizeAssetForCard);
  }, [data?.assets]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-base font-bold text-zinc-300">
          Loading market engine...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-red-300">
          API connection problem
        </Text>

        <Text className="mt-3 text-center text-sm leading-6 text-zinc-400">
          {error}
        </Text>

        <Text className="mt-3 text-center text-xs leading-5 text-zinc-500">
          Check that FastAPI is running on {API_BASE}. Yes, the machine needs
          the other machine to be awake. Revolutionary.
        </Text>

        <Pressable
          onPress={() => loadMarketState(true)}
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
            onRefresh={() => loadMarketState(true)}
            tintColor="#34d399"
          />
        }
      >
        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-[4px] text-emerald-400">
            AI Market Expert
          </Text>

          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Market Trading Fundamental Cross-Asset Bias & Sentiment
          </Text>

          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Live cross-asset market intelligence from FX, yields, equities,
            volatility, metals and model-based 12h projections.
          </Text>

          <View className="mt-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <Text className="text-lg font-black text-emerald-300">
              Trading is easier when you have an edge.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-300">
              Edge comes from understanding what is moving capital:
              cross-asset sentiment, macro regime, funding pressure and
              relative currency strength.
            </Text>
          </View>

          <Text className="mt-4 text-xs leading-5 text-zinc-500">
            Market data: {data.marketDataTimeBelgrade ?? data.timeBelgrade}
          </Text>
        </View>

        <Card className={`mb-6 ${toneClasses.bg} ${toneClasses.border}`}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-400">
                Active regime
              </Text>
              <Text className="mt-2 text-2xl font-black text-white">
                {data.regimeLabel ?? activeRegime.title}
              </Text>
              <Text className={`mt-2 text-sm font-bold ${toneClasses.text}`}>
                {data.confidenceLabel ?? activeRegime.label}
              </Text>
            </View>

            <View
              className={`rounded-2xl border px-3 py-2 ${toneClasses.pill}`}
            >
              <Text className={`text-sm font-black ${toneClasses.text}`}>
                {pct(data.regimeConfidence)}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-300">
            {data.regimeExplanation ?? activeRegime.summary}
          </Text>

          <View className="mt-4 flex-row gap-2">
            <SmallMetric
              label="Risk score"
              value={pctFromScore(data.riskScore)}
              valueClassName={
                data.riskScore >= 60
                  ? "text-emerald-300"
                  : data.riskScore <= 40
                  ? "text-red-300"
                  : "text-yellow-300"
              }
            />
            <SmallMetric label="Horizon" value={data.forecastHorizon} />
          </View>

          <View className="mt-4">
            {activeRegime.driverNotes.map((note) => (
              <View key={note} className="mt-2 flex-row">
                <Text className="mr-2 text-emerald-400">•</Text>
                <Text className="flex-1 text-sm leading-5 text-zinc-400">
                  {note}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle
          kicker="Predictions"
          title="Live model assets"
          subtitle="Only assets with validated live output are shown here. No fake BTC signal theater today."
        />

        {visibleAssets.length > 0 ? (
          visibleAssets.map((item) => (
            <AssetPredictionCard key={item.symbol} item={item} />
          ))
        ) : (
          <Card className="mb-6">
            <Text className="text-lg font-black text-white">
              No visible live assets
            </Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              The market engine is running, but no asset currently has visible
              model output.
            </Text>
          </Card>
        )}

        <SectionTitle
          kicker="Cross-asset"
          title="Market drivers"
          subtitle="Drivers summarize equities, volatility, USD, JPY, rates, metals and composite risk appetite."
        />

        {data.drivers.map((item) => (
          <DriverCard key={item.key} item={item} />
        ))}

        <SectionTitle
          kicker="FX"
          title="Currency strength"
          subtitle="Relative currency strength is calculated from the live FX cross matrix."
        />

        {data.currencyStrength.map((item, index) => (
          <CurrencyRow key={item.code} item={item} index={index} />
        ))}

        <Card className="mt-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">
            Disclaimer
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            {data.disclaimer ??
              "Educational market-intelligence output. Not financial advice."}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
