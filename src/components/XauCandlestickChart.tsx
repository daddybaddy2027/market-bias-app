import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import type { XauBotCandle, XauBotTrade } from "../services/xauBotApi";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function XauCandlestickChart({
  candles,
  trades,
}: {
  candles: XauBotCandle[];
  trades: XauBotTrade[];
}) {
  const [width, setWidth] = useState(900);
  const height = 430;
  const left = 12;
  const right = 64;
  const top = 18;
  const bottom = 28;
  const plotWidth = Math.max(100, width - left - right);
  const plotHeight = height - top - bottom;

  const visible = useMemo(() => candles.slice(-120), [candles]);
  const openTrades = useMemo(
    () => trades.filter((trade) => String(trade.status).toLowerCase() === "open"),
    [trades]
  );

  if (!visible.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Waiting for XAUUSD candles…</Text>
      </View>
    );
  }

  const lows = visible.map((c) => c.low).filter(finite);
  const highs = visible.map((c) => c.high).filter(finite);
  const overlays = openTrades
    .flatMap((trade) => [trade.entry_price, trade.sl_price, trade.tp_price])
    .filter(finite);

  const minRaw = Math.min(...lows, ...(overlays.length ? overlays : lows));
  const maxRaw = Math.max(...highs, ...(overlays.length ? overlays : highs));
  const rawRange = Math.max(0.01, maxRaw - minRaw);
  const pad = rawRange * 0.08;
  const minPrice = minRaw - pad;
  const maxPrice = maxRaw + pad;
  const range = maxPrice - minPrice;

  const y = (price: number) => top + ((maxPrice - price) / range) * plotHeight;
  const step = plotWidth / Math.max(1, visible.length);
  const bodyWidth = Math.max(1.5, Math.min(8, step * 0.58));

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const price = maxPrice - ratio * range;
    const yy = top + ratio * plotHeight;
    return { price, yy };
  });

  const last = visible[visible.length - 1];

  return (
    <View
      style={styles.shell}
      onLayout={(event) => setWidth(Math.max(320, event.nativeEvent.layout.width))}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x="0" y="0" width={width} height={height} fill="#07080b" rx="18" />

        {gridLines.map((grid) => (
          <React.Fragment key={grid.yy}>
            <Line
              x1={left}
              x2={width - right}
              y1={grid.yy}
              y2={grid.yy}
              stroke="#1b1d24"
              strokeWidth="1"
            />
            <SvgText x={width - right + 8} y={grid.yy + 4} fill="#71717a" fontSize="10">
              {grid.price.toFixed(2)}
            </SvgText>
          </React.Fragment>
        ))}

        {visible.map((candle, index) => {
          const x = left + step * index + step / 2;
          const bullish = candle.close >= candle.open;
          const candleColor = bullish ? "#34d399" : "#fb7185";
          const openY = y(candle.open);
          const closeY = y(candle.close);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

          return (
            <React.Fragment key={`${candle.timeframe}-${candle.time_utc}`}>
              <Line
                x1={x}
                x2={x}
                y1={y(candle.high)}
                y2={y(candle.low)}
                stroke={candleColor}
                strokeWidth="1"
              />
              <Rect
                x={x - bodyWidth / 2}
                y={bodyY}
                width={bodyWidth}
                height={bodyHeight}
                fill={bullish ? "#123f35" : "#4b1d2b"}
                stroke={candleColor}
                strokeWidth="1"
                rx="1"
              />
            </React.Fragment>
          );
        })}

        {openTrades.map((trade) => {
          const sideLabel = trade.side === 1 ? "BUY" : "SELL";
          const sideColor = trade.side === 1 ? "#22d3ee" : "#f59e0b";
          return (
            <React.Fragment key={trade.trade_id}>
              <Line
                x1={left}
                x2={width - right}
                y1={y(trade.entry_price)}
                y2={y(trade.entry_price)}
                stroke={sideColor}
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <SvgText
                x={left + 6}
                y={y(trade.entry_price) - 5}
                fill={sideColor}
                fontSize="10"
                fontWeight="700"
              >
                {sideLabel} {trade.entry_price.toFixed(2)}
              </SvgText>
              <Line
                x1={left}
                x2={width - right}
                y1={y(trade.sl_price)}
                y2={y(trade.sl_price)}
                stroke="#fb7185"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
              <Line
                x1={left}
                x2={width - right}
                y1={y(trade.tp_price)}
                y2={y(trade.tp_price)}
                stroke="#4ade80"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
            </React.Fragment>
          );
        })}

        <Line
          x1={left}
          x2={width - right}
          y1={y(last.close)}
          y2={y(last.close)}
          stroke="#e4e4e7"
          strokeWidth="0.8"
          strokeDasharray="2 5"
          opacity={0.55}
        />
        <SvgText
          x={width - right + 8}
          y={y(last.close) + 4}
          fill="#f4f4f5"
          fontSize="10"
          fontWeight="700"
        >
          {last.close.toFixed(2)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    minHeight: 430,
    borderWidth: 1,
    borderColor: "#20222b",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#07080b",
  },
  empty: {
    height: 430,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#20222b",
    borderRadius: 18,
    backgroundColor: "#07080b",
  },
  emptyText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "700",
  },
});
