import React from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import type { ApiAsset, Candle } from "../services/api";
import type { ModelDefinition } from "../config/modelCatalog";

function formatPrice(value: number | undefined | null, symbol: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (symbol.includes("JPY")) return value.toFixed(3);
  if (symbol === "XAUUSD") return value.toFixed(2);
  return value.toFixed(5);
}

function directionState(value?: string | null) {
  const text = String(value ?? "Neutral").toLowerCase();
  if (text.includes("bull")) return "bullish" as const;
  if (text.includes("bear")) return "bearish" as const;
  return "neutral" as const;
}

function palette(direction: "bullish" | "bearish" | "neutral") {
  if (direction === "bullish") {
    return {
      main: "#34d399",
      fill: "#10b981",
      label: "Bullish directional projection",
    };
  }
  if (direction === "bearish") {
    return {
      main: "#f87171",
      fill: "#ef4444",
      label: "Bearish directional projection",
    };
  }
  return {
    main: "#7dd3fc",
    fill: "#38bdf8",
    label: "Neutral · no directional path",
  };
}

export function ModelProjectionChart({
  candles,
  asset,
  model,
}: {
  candles: Candle[];
  asset?: ApiAsset;
  model: ModelDefinition;
}) {
  const width = 1000;
  const height = 440;
  const paddingLeft = 64;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 50;
  const historyEndX = 720;
  const projectionStartX = 750;
  const projectionEndX = width - paddingRight;
  const visibleCandles = candles.slice(-64);
  const lastCandle = visibleCandles[visibleCandles.length - 1];

  const currentPrice =
    asset?.currentPrice ??
    asset?.close ??
    lastCandle?.close;

  const rangeLow =
    typeof asset?.projectedLow === "number"
      ? asset.projectedLow
      : typeof currentPrice === "number"
      ? currentPrice
      : undefined;
  const rangeHigh =
    typeof asset?.projectedHigh === "number"
      ? asset.projectedHigh
      : typeof currentPrice === "number"
      ? currentPrice
      : undefined;

  const values = visibleCandles.flatMap((candle) => [candle.high, candle.low]);
  if (typeof currentPrice === "number") values.push(currentPrice);
  if (typeof rangeLow === "number") values.push(rangeLow);
  if (typeof rangeHigh === "number") values.push(rangeHigh);

  if (!values.length) {
    return (
      <View className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <Text className="text-xl font-black text-white">Market price & projection</Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          Candle data is not available yet. The current model output remains visible below.
        </Text>
      </View>
    );
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.0005, 1e-8);
  const minPrice = rawMin - rawRange * 0.16;
  const maxPrice = rawMax + rawRange * 0.16;
  const chartTop = paddingTop;
  const chartBottom = height - paddingBottom;
  const chartHeight = chartBottom - chartTop;

  const y = (price: number) =>
    chartTop +
    ((maxPrice - price) / Math.max(maxPrice - minPrice, Number.EPSILON)) * chartHeight;

  const candleStep =
    (historyEndX - paddingLeft) / Math.max(visibleCandles.length, 1);
  const bodyWidth = Math.max(2.5, candleStep * 0.58);
  const lastX =
    visibleCandles.length > 0
      ? paddingLeft +
        (visibleCandles.length - 1) * candleStep +
        candleStep / 2
      : historyEndX;

  const direction = directionState(asset?.bias);
  const colors = palette(direction);
  const zoneLow = rangeLow ?? currentPrice ?? rawMin;
  const zoneHigh = rangeHigh ?? currentPrice ?? rawMax;
  const zoneSpan = Math.max(zoneHigh - zoneLow, rawRange * 0.08);
  const startHalfWidth = zoneSpan * 0.08;
  const startUpper = (currentPrice ?? zoneHigh) + startHalfWidth;
  const startLower = (currentPrice ?? zoneLow) - startHalfWidth;

  const zonePoints = [
    `${lastX},${y(startUpper)}`,
    `${projectionEndX},${y(zoneHigh)}`,
    `${projectionEndX},${y(zoneLow)}`,
    `${lastX},${y(startLower)}`,
  ].join(" ");

  const directionalTarget =
    direction === "bullish"
      ? zoneLow + zoneSpan * 0.72
      : direction === "bearish"
      ? zoneHigh - zoneSpan * 0.72
      : currentPrice ?? (zoneLow + zoneHigh) / 2;

  const pathStartY = y(currentPrice ?? directionalTarget);
  const pathEndY = y(directionalTarget);
  const control1X = projectionStartX + 42;
  const control2X = projectionEndX - 48;
  const control1Y =
    direction === "bullish"
      ? pathStartY - 18
      : direction === "bearish"
      ? pathStartY + 18
      : pathStartY;
  const control2Y =
    direction === "bullish"
      ? pathEndY + 22
      : direction === "bearish"
      ? pathEndY - 22
      : pathEndY;
  const projectionPath = `M ${lastX} ${pathStartY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${projectionEndX} ${pathEndY}`;

  const gridPrices = Array.from({ length: 6 }, (_, index) =>
    maxPrice - ((maxPrice - minPrice) * index) / 5
  );

  return (
    <View className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-black text-white">Market price & forecast projection</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Historical H1 candles are observed market data. The shaded area is the model range.
            The directional curve is shown only for an active bullish or bearish call.
          </Text>
        </View>
        <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
          <Text style={{ color: colors.main }} className="text-xs font-black">
            {colors.label}
          </Text>
        </View>
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
        <Svg width="100%" height={370} viewBox={`0 0 ${width} ${height}`}>
          <Rect x="0" y="0" width={width} height={height} fill="#18181b" />

          {gridPrices.map((level) => (
            <React.Fragment key={level}>
              <Line
                x1={paddingLeft}
                x2={projectionEndX}
                y1={y(level)}
                y2={y(level)}
                stroke="#3f3f46"
                strokeWidth="1"
                opacity={0.55}
              />
              <SvgText x="7" y={y(level) + 4} fill="#a1a1aa" fontSize="13">
                {formatPrice(level, model.asset)}
              </SvgText>
            </React.Fragment>
          ))}

          <Rect
            x={projectionStartX}
            y={chartTop}
            width={projectionEndX - projectionStartX}
            height={chartHeight}
            fill="#0f172a"
            opacity={0.38}
          />
          <Line
            x1={projectionStartX}
            x2={projectionStartX}
            y1={chartTop}
            y2={chartBottom}
            stroke="#7dd3fc"
            strokeDasharray="8 8"
            opacity={0.75}
          />
          <SvgText
            x={projectionStartX + 10}
            y={chartTop + 18}
            fill="#7dd3fc"
            fontSize="13"
            fontWeight="700"
          >
            {model.horizonH}h forecast horizon
          </SvgText>

          {visibleCandles.map((candle, index) => {
            const x = paddingLeft + index * candleStep + candleStep / 2;
            const bullish = candle.close >= candle.open;
            const candleColor = bullish ? "#34d399" : "#f87171";
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyBottom = y(Math.min(candle.open, candle.close));
            return (
              <React.Fragment key={`${candle.time_utc}-${index}`}>
                <Line
                  x1={x}
                  x2={x}
                  y1={y(candle.high)}
                  y2={y(candle.low)}
                  stroke={candleColor}
                  strokeWidth="1.4"
                />
                <Rect
                  x={x - bodyWidth / 2}
                  y={bodyTop}
                  width={bodyWidth}
                  height={Math.max(2, bodyBottom - bodyTop)}
                  fill={bullish ? "#10b981" : "#ef4444"}
                  opacity={0.92}
                />
              </React.Fragment>
            );
          })}

          <Polygon
            points={zonePoints}
            fill={colors.fill}
            opacity={0.13}
            stroke={colors.main}
            strokeWidth="1.8"
          />

          {direction !== "neutral" ? (
            <>
              <Path
                d={projectionPath}
                fill="none"
                stroke="#09090b"
                strokeWidth="7"
                opacity={0.8}
              />
              <Path
                d={projectionPath}
                fill="none"
                stroke={colors.main}
                strokeWidth="3.5"
                strokeDasharray="10 7"
              />
              <Circle
                cx={projectionEndX}
                cy={pathEndY}
                r="5"
                fill={colors.main}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </>
          ) : (
            <SvgText
              x={projectionStartX + 28}
              y={(chartTop + chartBottom) / 2}
              fill="#7dd3fc"
              fontSize="15"
              fontWeight="700"
            >
              No directional path while signal is neutral
            </SvgText>
          )}

          {typeof currentPrice === "number" ? (
            <Line
              x1={paddingLeft}
              x2={projectionEndX}
              y1={y(currentPrice)}
              y2={y(currentPrice)}
              stroke="#f4f4f5"
              strokeDasharray="4 6"
              opacity={0.5}
            />
          ) : null}
        </Svg>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Current</Text>
          <Text className="mt-1 text-base font-black text-white">
            {formatPrice(currentPrice, model.asset)}
          </Text>
        </View>
        <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Projected low</Text>
          <Text className="mt-1 text-base font-black text-white">
            {formatPrice(rangeLow, model.asset)}
          </Text>
        </View>
        <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-[10px] font-bold uppercase text-zinc-500">Projected high</Text>
          <Text className="mt-1 text-base font-black text-white">
            {formatPrice(rangeHigh, model.asset)}
          </Text>
        </View>
      </View>
    </View>
  );
}
