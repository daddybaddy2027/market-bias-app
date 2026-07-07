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
import Svg, { Line, Polygon, Rect, Text as SvgText } from "react-native-svg";

import {
  ApiAsset,
  Bias,
  Candle,
  MarketState,
  PerformanceHistoryRow,
  PerformanceSummaryRow,
  fetchCandles,
  fetchMarketState,
  fetchPerformanceHistory,
  fetchPerformanceSummary,
  getAssetSymbol,
} from "../../services/api";

import {
  PUBLIC_PREVIEW_PERFORMANCE,
  canViewModelPerformance,
  isModelLocked,
} from "../../config/access";

import { useAuth } from "../../providers/AuthProvider";

import {
  SupportProjectButton,
} from "../../components/SupportProjectButton";

import {
  PairContextCard,
} from "../../components/PairContextCard";


type TabKey = "projection" | "history";

type ParsedRoute = {
  asset: string;
  horizonH?: number;
  modelId?: string;
};

type AssetDetail = {
  item: ApiAsset;
  symbol: string;
  horizonH: number;
  confidence: number;
  modelUsage: string;
};

const ASSET_DISPLAY_NAMES: Record<string, string> = {
  EURUSD: "Euro / US Dollar",
  EURJPY: "Euro / Japanese Yen",
  GBPJPY: "British Pound / Japanese Yen",
  GBPAUD: "British Pound / Australian Dollar",
  AUDUSD: "Australian Dollar / US Dollar",
  GBPUSD: "British Pound / US Dollar",
  USDJPY: "US Dollar / Japanese Yen",
};

const MODEL_VALIDATION_STATS: Record<
  string,
  {
    accuracy: number;
    n: number;
    note: string;
  }
> = {
  "AUDUSD-12": {
    accuracy: 0.783333,
    n: 60,
    note: "No-leak validation sample. High-confidence AUDUSD 12h signals.",
  },
  "EURUSD-6": {
    accuracy: 1.0,
    n: 5,
    note: "Low-sample high-conviction validation. Treat with caution until more live samples are collected.",
  },
  "EURUSD-12": {
    accuracy: 0.814815,
    n: 27,
    note: "No-leak validation sample. Bearish-regime signal profile, one-sided regime warning.",
  },
  "GBPUSD-12": {
    accuracy: 1.0,
    n: 5,
    note: "Low-sample high-conviction validation. Treat with caution until more live samples are collected.",
  },
  "USDJPY-6": {
    accuracy: 0.613208,
    n: 106,
    note: "No-leak validation sample. Frequent USDJPY 6h signal profile.",
  },
  "USDJPY-12": {
    accuracy: 0.675676,
    n: 37,
    note: "No-leak validation sample. USDJPY 12h medium-frequency signal profile.",
  },
};

function getValidationStats(
  symbol: string,
  horizonH: number
) {
  return MODEL_VALIDATION_STATS[
    `${symbol.toUpperCase()}-${horizonH}`
  ];
}

function makeLockedAsset(
  symbol: string,
  horizonH: number
): ApiAsset {
  return {
    asset: symbol,
    symbol,
    display:
      ASSET_DISPLAY_NAMES[symbol] ??
      symbol,
    horizon_h: horizonH,
    bias: "Neutral",
    expectedMove: "Unlock Pro",
    expectedRange: "Hidden",
    confidence: 0,
    signal_strength: "Pro model",
    status: "Pro model",
    model_status: "pro_locked",
    visible: true,
    usable: false,
    drivers: [],
    explanation:
      "The current forecast is protected by the active Pro subscription rules.",
  };
}

function parseRouteSymbol(raw: string): ParsedRoute {
  const cleaned = raw.toUpperCase();
  const match = cleaned.match(/^([A-Z0-9]+)-(\d+)H(?:-(.+))?$/);

  if (match) {
    return {
      asset: match[1],
      horizonH: Number(match[2]),
      modelId: match[3] ? modelSlug(match[3]) : undefined,
    };
  }

  return { asset: cleaned };
}

function pct(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}


function signedPips(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} pips`;
}

function compactNumber(value?: number | null, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

function modelSlug(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_");
}

function formatPrice(value: number | undefined | null, symbol: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (symbol.includes("JPY")) return value.toFixed(3);
  return value.toFixed(5);
}

function formatDate(value?: string) {
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

function getConfidence(item: ApiAsset) {
  if (typeof item.confidence === "number" && Number.isFinite(item.confidence)) {
    return item.confidence;
  }
  if (item.confidence_label === "high") return 0.75;
  if (item.confidence_label === "medium") return 0.5;
  if (item.confidence_label === "normal") return 0.35;
  return 0;
}

function getBiasClasses(bias: Bias) {
  if (bias === "Bullish") {
    return {
      text: "text-emerald-300",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      zone: "#10b981",
    };
  }

  if (bias === "Bearish") {
    return {
      text: "text-red-300",
      bg: "bg-red-500/15",
      border: "border-red-500/40",
      zone: "#ef4444",
    };
  }

  return {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-500/40",
    zone: "#38bdf8",
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

function CandleForecastChart({
  candles,
  asset,
}: {
  candles: Candle[];
  asset: ApiAsset;
}) {
  const width = 980;
  const height = 420;
  const paddingLeft = 58;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 44;
  const historicalWidth = 720;
  const forecastStartX = paddingLeft + historicalWidth;
  const forecastEndX = width - paddingRight;

  const visibleCandles = candles.slice(-64);
  const currentPrice =
    asset.currentPrice ??
    asset.close ??
    visibleCandles[visibleCandles.length - 1]?.close;

  const projectedLow =
    typeof asset.projectedLow === "number" ? asset.projectedLow : currentPrice;
  const projectedHigh =
    typeof asset.projectedHigh === "number" ? asset.projectedHigh : currentPrice;

  const values = visibleCandles.flatMap((candle) => [candle.high, candle.low]);
  if (typeof projectedLow === "number") values.push(projectedLow);
  if (typeof projectedHigh === "number") values.push(projectedHigh);
  if (typeof currentPrice === "number") values.push(currentPrice);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = Math.max((rawMax - rawMin) * 0.12, rawMax * 0.0005);
  const minPrice = rawMin - margin;
  const maxPrice = rawMax + margin;

  const chartTop = paddingTop;
  const chartBottom = height - paddingBottom;
  const chartHeight = chartBottom - chartTop;

  const y = (price: number) =>
    chartTop +
    ((maxPrice - price) / Math.max(maxPrice - minPrice, Number.EPSILON)) *
      chartHeight;

  const candleStep = historicalWidth / Math.max(visibleCandles.length, 1);
  const bodyWidth = Math.max(2, candleStep * 0.58);
  const lastX =
    paddingLeft +
    Math.max(visibleCandles.length - 1, 0) * candleStep +
    candleStep / 2;

  const startHalfRange =
    typeof currentPrice === "number" &&
    typeof projectedHigh === "number" &&
    typeof projectedLow === "number"
      ? Math.max((projectedHigh - projectedLow) * 0.12, currentPrice * 0.00005)
      : 0;

  const startUpper =
    typeof currentPrice === "number" ? currentPrice + startHalfRange : rawMax;
  const startLower =
    typeof currentPrice === "number" ? currentPrice - startHalfRange : rawMin;

  const conePoints = [
    `${lastX},${y(startUpper)}`,
    `${forecastEndX},${y(projectedHigh ?? startUpper)}`,
    `${forecastEndX},${y(projectedLow ?? startLower)}`,
    `${lastX},${y(startLower)}`,
  ].join(" ");

  const classes = getBiasClasses(asset.bias ?? "Neutral");
  const gridPrices = Array.from({ length: 5 }, (_, index) => {
    return maxPrice - ((maxPrice - minPrice) * index) / 4;
  });

  return (
    <Card className="mb-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-white">
            Market price & forecast zone
          </Text>
          <Text className="mt-1 text-sm leading-5 text-zinc-500">
            Historical H1 candles are real. The shaded cone is a probability
            zone, not an exact future route.
          </Text>
        </View>

        <View
          className={`rounded-full border px-3 py-1 ${classes.bg} ${classes.border}`}
        >
          <Text className={`text-xs font-black ${classes.text}`}>
            {asset.bias}
          </Text>
        </View>
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
        <Svg width="100%" height={360} viewBox={`0 0 ${width} ${height}`}>
          <Rect x="0" y="0" width={width} height={height} fill="#18181b" />

          {gridPrices.map((price) => (
            <React.Fragment key={price}>
              <Line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y(price)}
                y2={y(price)}
                stroke="#3f3f46"
                strokeWidth="1"
                opacity={0.55}
              />
              <SvgText x={5} y={y(price) + 4} fill="#a1a1aa" fontSize="13">
                {formatPrice(price, getAssetSymbol(asset))}
              </SvgText>
            </React.Fragment>
          ))}

          <Rect
            x={forecastStartX}
            y={chartTop}
            width={forecastEndX - forecastStartX}
            height={chartHeight}
            fill="#0f172a"
            opacity={0.32}
          />

          <Line
            x1={forecastStartX}
            x2={forecastStartX}
            y1={chartTop}
            y2={chartBottom}
            stroke="#7dd3fc"
            strokeDasharray="8 8"
            opacity={0.8}
          />

          <SvgText
            x={forecastStartX + 10}
            y={chartTop + 18}
            fill="#7dd3fc"
            fontSize="13"
            fontWeight="700"
          >
            forecast horizon
          </SvgText>

          {visibleCandles.map((candle, index) => {
            const x = paddingLeft + index * candleStep + candleStep / 2;
            const bullish = candle.close >= candle.open;
            const color = bullish ? "#34d399" : "#f87171";
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyBottom = y(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(2, bodyBottom - bodyTop);

            return (
              <React.Fragment key={`${candle.time_utc}-${index}`}>
                <Line
                  x1={x}
                  x2={x}
                  y1={y(candle.high)}
                  y2={y(candle.low)}
                  stroke={color}
                  strokeWidth="1.4"
                />
                <Rect
                  x={x - bodyWidth / 2}
                  y={bodyTop}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={bullish ? "#10b981" : "#ef4444"}
                  opacity={0.9}
                />
              </React.Fragment>
            );
          })}

          <Polygon
            points={conePoints}
            fill={classes.zone}
            opacity={0.16}
            stroke={classes.zone}
            strokeWidth="2"
          />

          {typeof currentPrice === "number" ? (
            <Line
              x1={paddingLeft}
              x2={forecastEndX}
              y1={y(currentPrice)}
              y2={y(currentPrice)}
              stroke="#f4f4f5"
              strokeDasharray="4 6"
              opacity={0.5}
            />
          ) : null}
        </Svg>
      </View>

      <View className="mt-4 flex-row gap-2">
        <SmallMetric
          label="Current"
          value={formatPrice(currentPrice, getAssetSymbol(asset))}
        />
        <SmallMetric
          label="Projected low"
          value={formatPrice(asset.projectedLow, getAssetSymbol(asset))}
        />
        <SmallMetric
          label="Projected high"
          value={formatPrice(asset.projectedHigh, getAssetSymbol(asset))}
        />
      </View>
    </Card>
  );
}

function AccuracyCard({
  summary,
  symbol,
  horizonH,
  modelFamily,
  asset,
}: {
  summary: PerformanceSummaryRow | null;
  symbol: string;
  horizonH: number;
  modelFamily?: string;
  asset?: ApiAsset;
}) {
  const validation = getValidationStats(
    symbol,
    horizonH
  );

  const isFinalAppV2 =
    modelFamily === "clean_pro_final_app_v2";

  const isMlp =
    modelFamily?.includes("mlp_live_v1") ||
    asset?.model_group === "mlp_live_v1" ||
    asset?.source === "mlp_live_v1";

  const useMlpValidation =
    !!isMlp &&
    typeof asset?.validation_direction_accuracy === "number";

  // Same rule as dashboard:
  // clean_pro_final_app_v2 and MLP variants use model-owned validation stats
  // until backend performance becomes fully model-family aware.
  const useValidationAccuracy =
    useMlpValidation ||
    (isFinalAppV2 && !!validation);

  const hasLiveAccuracy =
    !useValidationAccuracy &&
    typeof summary?.direction_accuracy ===
      "number";

  const directionAccuracy =
    useMlpValidation
      ? asset?.validation_direction_accuracy ?? null
      : useValidationAccuracy
      ? validation?.accuracy ?? null
      : hasLiveAccuracy
      ? summary?.direction_accuracy ?? null
      : validation?.accuracy ?? null;

  const directionN =
    useMlpValidation
      ? asset?.validation_trades ?? 0
      : useValidationAccuracy
      ? validation?.n ?? 0
      : hasLiveAccuracy
      ? summary?.direction_predictions ?? 0
      : validation?.n ?? 0;

  const sourceLabel =
    useMlpValidation
      ? "Walk-forward MLP validation"
      : useValidationAccuracy
      ? "Validated test performance"
      : hasLiveAccuracy
      ? "Verified live performance"
      : validation
      ? "Validated test performance"
      : "Verified performance";

  return (
    <Card className="mb-5">
      <Text className="text-xl font-black text-white">
        {sourceLabel}
      </Text>

      <Text className="mt-2 text-sm leading-6 text-zinc-500">
        Live forecasts are matched with the actual market price after the full
        horizon. Until enough live samples are collected, the app shows the
        latest no-leak validation sample separately.
      </Text>

      <View className="mt-4 flex-row gap-2">
        <SmallMetric
          label={
            hasLiveAccuracy
              ? "Live direction accuracy"
              : validation
              ? "Validation direction accuracy"
              : "Direction accuracy"
          }
          value={
            directionAccuracy === null
              ? "Collecting"
              : `${pct(directionAccuracy)} · n=${directionN}`
          }
          valueClassName={
            hasLiveAccuracy
              ? "text-emerald-300"
              : validation
              ? "text-cyan-300"
              : "text-yellow-300"
          }
        />

        <SmallMetric
          label="Range close hit"
          value={
            typeof summary?.range_close_hit_rate === "number"
              ? pct(summary.range_close_hit_rate)
              : "N/A"
          }
        />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric
          label="Range path hit"
          value={
            typeof summary?.range_path_hit_rate === "number"
              ? pct(summary.range_path_hit_rate)
              : "N/A"
          }
        />

        <SmallMetric
          label="Average move error"
          value={
            typeof summary?.mu_mae === "number"
              ? pct(summary.mu_mae, 3)
              : "N/A"
          }
        />
      </View>

      <View className="mt-2 flex-row gap-2">
        <SmallMetric
          label="Evaluated live"
          value={
            summary
              ? String(summary.evaluated_predictions)
              : "0"
          }
        />

        <SmallMetric
          label="Neutral calls"
          value={
            summary
              ? String(summary.neutral_predictions)
              : "0"
          }
        />
      </View>

      {useMlpValidation ? (
        <>
          <View className="mt-2 flex-row gap-2">
            <SmallMetric
              label="Validated pips"
              value={signedPips(asset?.validation_total_pips)}
              valueClassName="text-emerald-300"
            />
            <SmallMetric
              label="Avg weekly pips"
              value={signedPips(asset?.validation_avg_week_pips)}
            />
          </View>

          <View className="mt-2 flex-row gap-2">
            <SmallMetric
              label="Profitable weeks"
              value={
                typeof asset?.validation_profitable_weeks === "number" &&
                typeof asset?.validation_active_weeks === "number"
                  ? `${asset.validation_profitable_weeks}/${asset.validation_active_weeks}`
                  : "N/A"
              }
              valueClassName="text-cyan-300"
            />
            <SmallMetric
              label="Profit factor"
              value={compactNumber(asset?.validation_profit_factor)}
            />
          </View>

          <View className="mt-2 flex-row gap-2">
            <SmallMetric
              label="Max drawdown"
              value={signedPips(asset?.validation_max_drawdown_pips)}
              valueClassName="text-red-300"
            />
            <SmallMetric
              label="Win rate"
              value={pct(asset?.validation_win_rate)}
            />
          </View>
        </>
      ) : null}

      {!hasLiveAccuracy && validation ? (
        <View className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <Text className="text-xs uppercase tracking-wider text-cyan-300">
            Validation note
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-300">
            {asset?.validation_note ?? validation.note}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function HistoryTab({
  rows,
  symbol,
}: {
  rows: PerformanceHistoryRow[];
  symbol: string;
}) {
  if (!rows.length) {
    return (
      <Card>
        <Text className="text-xl font-black text-white">Prediction history</Text>
        <Text className="mt-3 text-sm leading-6 text-zinc-400">
          No verified history is available for this asset and horizon yet.
        </Text>
      </Card>
    );
  }

  return (
    <View>
      <Card className="mb-5">
        <Text className="text-xl font-black text-white">
          Verified prediction history
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-500">
          Pending forecasts remain visible but do not enter accuracy until the
          full horizon has passed.
        </Text>
      </Card>

      {rows.map((row, index) => {
        const bias = (row.bias as Bias) ?? "Neutral";
        const classes = getBiasClasses(bias);
        const evaluated = row.evaluation_status === "evaluated";
        const directionText = !evaluated
          ? "Pending"
          : row.direction_eligible === false
          ? "Neutral"
          : row.direction_hit === 1
          ? "Hit"
          : "Miss";
        const rangeText = !evaluated
          ? "Pending"
          : row.range_close_hit === 1
          ? "Close inside"
          : "Close outside";

        return (
          <View
            key={`${row.prediction_time_utc ?? row.time_utc}-${index}`}
            className="mb-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-black text-white">
                  {formatDate(
                    row.prediction_time_belgrade ??
                      row.prediction_time_utc ??
                      row.time_belgrade ??
                      row.time_utc
                  )}
                </Text>
                <Text className="mt-1 text-xs text-zinc-500">
                  Confidence {row.confidence_label ?? "N/A"}
                </Text>
              </View>

              <View
                className={`rounded-full border px-3 py-1 ${classes.bg} ${classes.border}`}
              >
                <Text className={`text-xs font-black ${classes.text}`}>
                  {bias}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <SmallMetric
                label="Start price"
                value={formatPrice(
                  row.start_price_used ?? row.current_price,
                  symbol
                )}
              />
              <SmallMetric
                label="Actual close"
                value={
                  evaluated ? formatPrice(row.actual_close, symbol) : "Pending"
                }
              />
            </View>

            <View className="mt-2 flex-row gap-2">
              <SmallMetric
                label="Expected move"
                value={
                  row.expected_move_text ??
                  (typeof row.pred_mu_ret === "number"
                    ? pct(row.pred_mu_ret, 3)
                    : "N/A")
                }
                valueClassName={classes.text}
              />
              <SmallMetric
                label="Actual move"
                value={
                  evaluated && typeof row.actual_log_return === "number"
                    ? pct(row.actual_log_return, 3)
                    : "Pending"
                }
              />
            </View>

            <View className="mt-4 flex-row gap-2">
              <View className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <Text className="text-xs uppercase tracking-wider text-zinc-500">
                  Direction
                </Text>
                <Text
                  className={`mt-1 text-sm font-black ${
                    directionText === "Hit"
                      ? "text-emerald-300"
                      : directionText === "Miss"
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {directionText}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <Text className="text-xs uppercase tracking-wider text-zinc-500">
                  Forecast zone
                </Text>
                <Text
                  className={`mt-1 text-sm font-black ${
                    rangeText === "Close inside"
                      ? "text-emerald-300"
                      : rangeText === "Close outside"
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {rangeText}
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
  const {
    isAuthenticated,
    isPro,
  } = useAuth();

  const params = useLocalSearchParams<{ symbol?: string }>();
  const rawSymbol = String(params.symbol ?? "").toUpperCase();
  const parsed = parseRouteSymbol(rawSymbol);

  const [tab, setTab] = useState<TabKey>("projection");
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [summary, setSummary] = useState<PerformanceSummaryRow | null>(null);
  const [history, setHistory] = useState<PerformanceHistoryRow[]>([]);
  const [optionalError, setOptionalError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setFatalError(null);
      setOptionalError(null);

      const routeHorizon =
        parsed.horizonH ?? 12;

      if (
        isModelLocked(
          parsed.asset,
          routeHorizon,
          isPro
        )
      ) {
        const lockedAsset =
          makeLockedAsset(
            parsed.asset,
            routeHorizon
          );

        setMarketState(null);
        setDetail({
          item: lockedAsset,
          symbol: parsed.asset,
          horizonH: routeHorizon,
          confidence: 0,
          modelUsage: "Pro",
        });
        setCandles([]);
        setSummary(null);
        setHistory([]);
        return;
      }

      const latest =
        await fetchMarketState();

      setMarketState(latest);

      const asset = latest.assets.find((item) => {
        const symbol = getAssetSymbol(item);
        const horizon = item.horizon_h ?? 12;
        const itemModelId = modelSlug(
          item.model_id ?? item.model_family ?? item.source
        );

        return (
          symbol === parsed.asset &&
          (parsed.horizonH === undefined || horizon === parsed.horizonH) &&
          (!parsed.modelId || itemModelId === parsed.modelId)
        );
      });

      if (!asset) throw new Error(`No live model output for ${rawSymbol}.`);

      const horizonH = asset.horizon_h ?? 12;
      setDetail({
        item: asset,
        symbol: getAssetSymbol(asset),
        horizonH,
        confidence: getConfidence(asset),
        modelUsage:
          asset.model_status === "range_only_experimental"
            ? "Range only"
            : asset.expectedRange
            ? "Direction + Range"
            : "Direction only",
      });

      const performanceAllowed =
        canViewModelPerformance(
          getAssetSymbol(asset),
          horizonH,
          isPro
        );

      const [candlesResult, summaryResult, historyResult] =
        await Promise.allSettled([
          fetchCandles(
            getAssetSymbol(asset),
            96
          ),

          performanceAllowed
            ? fetchPerformanceSummary(
                getAssetSymbol(asset),
                horizonH
              )
            : Promise.resolve([]),

          performanceAllowed
            ? fetchPerformanceHistory(
                getAssetSymbol(asset),
                horizonH,
                120,
                asset.model_family
              )
            : Promise.resolve([]),
        ]);

      const errors: string[] = [];

      if (candlesResult.status === "fulfilled") {
        setCandles(candlesResult.value);
      } else {
        errors.push("candles");
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value[0] ?? null);
      } else {
        errors.push("performance summary");
      }

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value);
      } else {
        errors.push("prediction history");
      }

      if (errors.length) {
        setOptionalError(`Some optional data could not load: ${errors.join(", ")}.`);
      }
    } catch (err: any) {
      setFatalError(err?.message ?? "Failed to load asset.");
      setDetail(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 60_000);
    return () => clearInterval(id);
  }, [rawSymbol, isPro]);

  const classes = useMemo(
    () => getBiasClasses(detail?.item.bias ?? "Neutral"),
    [detail?.item.bias]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="font-bold text-zinc-300">Loading asset...</Text>
      </SafeAreaView>
    );
  }

  if (fatalError || !detail) {
    return (
      <SafeAreaView className="flex-1 bg-black px-5 pt-8">
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
        >
          <Text className="font-bold text-zinc-300">← Back</Text>
        </Pressable>

        <Text className="text-2xl font-black text-white">{rawSymbol}</Text>
        <Text className="mt-3 text-sm leading-6 text-red-300">{fatalError}</Text>

        <Pressable
          onPress={() => load(true)}
          className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3"
        >
          <Text className="font-black text-emerald-300">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const asset = detail.item;

  const directlyLocked =
    isModelLocked(
      detail.symbol,
      detail.horizonH,
      isPro
    );

  const canSeePerformance =
    canViewModelPerformance(
      detail.symbol,
      detail.horizonH,
      isPro
    );

  if (directlyLocked) {
    return (
      <SafeAreaView className="flex-1 bg-black px-5 pt-8">
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 active:opacity-70"
        >
          <Text className="font-bold text-zinc-300">
            ← Back
          </Text>
        </Pressable>

        <View className="rounded-3xl border border-violet-500/40 bg-violet-500/10 p-6">
          <View className="self-start rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1">
            <Text className="text-xs font-black uppercase tracking-[3px] text-violet-300">
              Pro model
            </Text>
          </View>

          <Text className="mt-5 text-4xl font-black text-white">
            {detail.symbol} {detail.horizonH}h
          </Text>

          <Text className="mt-2 text-sm text-zinc-500">
            {asset.display} · {asset.model_family ?? asset.source ?? "model"}
          </Text>

          <Text className="mt-5 text-base leading-7 text-zinc-300">
            The current bias, probability zone, confidence and
            verified prediction history are part of AI Market
            Expert Pro.
          </Text>

          <View className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <Text className="text-sm leading-6 text-zinc-400">
              Sign in with an active Pro account to unlock this
              model. The forecast payload and verified history
              are protected in Supabase by row-level access rules.
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push(
                (isAuthenticated
                  ? "/pricing"
                  : "/login") as never
              )
            }
            className="mt-6 rounded-2xl border border-violet-400/50 bg-violet-500/20 px-5 py-4 active:opacity-70"
          >
            <Text className="text-center font-black text-violet-200">
              {isAuthenticated
                ? "View Pro plan"
                : "Sign in"}
            </Text>
          </Pressable>
        </View>
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
          <Text className="font-bold text-zinc-300">← Back to dashboard</Text>
        </Pressable>

        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-[4px] text-emerald-400">
            Asset detail
          </Text>

          <View className="mt-4 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-4xl font-black text-white">
                {detail.symbol} {detail.horizonH}h
              </Text>
              <Text className="mt-1 text-base text-zinc-500">
                {asset.display} · {asset.model_family ?? asset.source ?? "model"}
              </Text>
            </View>

            <View
              className={`rounded-full border px-3 py-1 ${classes.bg} ${classes.border}`}
            >
              <Text className={`text-xs font-black ${classes.text}`}>
                {asset.bias}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-400">
            Market data: {marketState?.marketDataTimeBelgrade ?? marketState?.timeBelgrade}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-zinc-500">
            Predictions and cross-asset analysis currently refresh every closed
            market hour during stabilization.
          </Text>
        </View>

        {optionalError ? (
          <View className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <Text className="text-sm font-bold text-yellow-300">{optionalError}</Text>
          </View>
        ) : null}

        {PUBLIC_PREVIEW_PERFORMANCE ? (
          <View className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <Text className="text-xs font-black uppercase tracking-[2px] text-cyan-300">
              Public beta · Verified performance unlocked
            </Text>

            <Text className="mt-2 text-sm leading-6 text-zinc-300">
              Live accuracy and completed prediction history are temporarily
              available during the public beta. Results update as additional
              forecasts reach their evaluation horizon.
            </Text>
          </View>
        ) : null}

        <View className="mb-5 flex-row gap-2">
          <TabButton
            label="Projection"
            active={tab === "projection"}
            onPress={() => setTab("projection")}
          />
          {canSeePerformance ? (
            <TabButton
              label="History"
              active={tab === "history"}
              onPress={() => setTab("history")}
            />
          ) : null}
        </View>

        {tab === "projection" ? (
          <View>
            {candles.length ? (
              <CandleForecastChart candles={candles} asset={asset} />
            ) : (
              <Card className="mb-5">
                <Text className="text-xl font-black text-white">Candle chart unavailable</Text>
                <Text className="mt-2 text-sm leading-6 text-zinc-400">
                  The latest prediction remains available below.
                </Text>
              </Card>
            )}

            <Card className="mb-5">
              <Text className="text-xl font-black text-white">Current model read</Text>

              <View className="mt-4 flex-row gap-2">
                <SmallMetric
                  label="Expected move"
                  value={asset.expectedMove ?? "N/A"}
                  valueClassName={classes.text}
                />
                <SmallMetric
                  label={`${detail.horizonH}h range`}
                  value={asset.expectedRange ?? "N/A"}
                />
              </View>

              <View className="mt-2 flex-row gap-2">
                <SmallMetric label="Confidence" value={pct(detail.confidence)} />
                <SmallMetric label="Model usage" value={detail.modelUsage} />
              </View>

              <View className="mt-2 flex-row gap-2">
                <SmallMetric
                  label="Latest model output"
                  value={
                    typeof asset.prob_up === "number"
                      ? `${pct(asset.prob_up)} up`
                      : "N/A"
                  }
                />
                <SmallMetric
                  label="Model source"
                  value={asset.prob_source_used ?? asset.public_status ?? "N/A"}
                />
              </View>

              <View className="mt-2 flex-row gap-2">
                <SmallMetric
                  label="Threshold confidence"
                  value={
                    typeof asset.threshold_confidence === "number"
                      ? pct(asset.threshold_confidence)
                      : "N/A"
                  }
                />
                <SmallMetric
                  label="Active threshold"
                  value={
                    typeof asset.threshold_used === "number"
                      ? pct(asset.threshold_used)
                      : "N/A"
                  }
                />
              </View>

              {asset.model_group === "mlp_live_v1" ||
              asset.source === "mlp_live_v1" ||
              asset.model_family?.includes("mlp_live_v1") ? (
                <>
                  <View className="mt-2 flex-row gap-2">
                    <SmallMetric
                      label="Validated pips"
                      value={signedPips(asset.validation_total_pips)}
                      valueClassName="text-emerald-300"
                    />
                    <SmallMetric
                      label="Profitable weeks"
                      value={
                        typeof asset.validation_profitable_weeks === "number" &&
                        typeof asset.validation_active_weeks === "number"
                          ? `${asset.validation_profitable_weeks}/${asset.validation_active_weeks}`
                          : "N/A"
                      }
                      valueClassName="text-cyan-300"
                    />
                  </View>

                  <View className="mt-2 flex-row gap-2">
                    <SmallMetric
                      label="TP1 / TP2"
                      value={
                        typeof asset.tp1_pips === "number" &&
                        typeof asset.tp2_pips === "number"
                          ? `${asset.tp1_pips.toFixed(1)} / ${asset.tp2_pips.toFixed(1)} pips`
                          : "N/A"
                      }
                    />
                    <SmallMetric
                      label="SL"
                      value={signedPips(asset.sl_pips)}
                      valueClassName="text-red-300"
                    />
                  </View>
                </>
              ) : null}

              <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <Text className="text-xs uppercase tracking-wider text-zinc-500">
                  Signal status
                </Text>
                <Text className="mt-1 text-sm font-black text-sky-300">
                  {asset.status ?? asset.signal_strength ?? "Model read"}
                </Text>
              </View>

              <Text className="mt-4 text-sm leading-6 text-zinc-400">
                {asset.explanation?.trim() ||
                  "This is a probabilistic direction and range estimate, not an exact path prediction or trade instruction."}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {(asset.drivers ?? []).map((driver) => (
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

            <PairContextCard asset={asset} marketState={marketState} />

            {canSeePerformance ? (
              <AccuracyCard
                summary={summary}
                symbol={detail.symbol}
                horizonH={detail.horizonH}
                modelFamily={
                  asset.model_family ??
                  asset.source
                }
                asset={asset}
              />
            ) : null}
          </View>
        ) : canSeePerformance ? (
          <HistoryTab rows={history} symbol={detail.symbol} />
        ) : (
          <Card>
            <Text className="text-xl font-black text-white">
              Performance history is locked
            </Text>

            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Verified prediction history is available to active Pro accounts.
            </Text>
          </Card>
        )}

        <SupportProjectButton compact />

        <Card className="mt-5">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">Disclaimer</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Research and educational market-intelligence output. Not financial
            advice. Historical live performance does not guarantee future results.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
