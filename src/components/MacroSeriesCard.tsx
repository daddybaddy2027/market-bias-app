import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import type { MacroSeriesPoint } from "../services/macroApi";

function formatNumber(value?: number | null, unit?: string | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  const text = value.toFixed(digits);

  if (unit === "%") {
    return `${text}%`;
  }

  return text;
}

function formatDate(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function labelClass(point?: MacroSeriesPoint) {
  const text = `${point?.interpretation_label ?? ""} ${point?.bias_for_usd ?? ""} ${point?.hotter_cooler ?? ""}`.toLowerCase();

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

function makePath(points: MacroSeriesPoint[], width: number, height: number) {
  if (points.length < 2) return "";

  const paddingLeft = 44;
  const paddingRight = 18;
  const paddingTop = 20;
  const paddingBottom = 32;

  const values = points.map((p) => p.value).filter((v) => Number.isFinite(v));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.001, 1e-9);

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const x = (index: number) =>
    paddingLeft + (chartWidth * index) / Math.max(points.length - 1, 1);

  const y = (value: number) =>
    paddingTop + ((maxValue - value) / range) * chartHeight;

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join(" ");
}

export function MacroSeriesCard({
  title,
  subtitle,
  points,
}: {
  title?: string;
  subtitle?: string;
  points: MacroSeriesPoint[];
}) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = latest?.previous_value ?? sorted[sorted.length - 2]?.value ?? null;
  const delta = latest?.delta ?? (typeof previous === "number" ? latest.value - previous : null);

  const width = 960;
  const height = 280;
  const path = makePath(sorted.slice(-160), width, height);
  const chartPoints = sorted.slice(-160);
  const values = chartPoints.map((p) => p.value).filter((v) => Number.isFinite(v));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;

  return (
    <View className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-[3px] text-zinc-500">
            {latest?.category?.replace(/_/g, " ") ?? "Macro"}
          </Text>

          <Text className="mt-2 text-xl font-black text-white">
            {title ?? latest?.indicator_label ?? "Macro series"}
          </Text>

          {subtitle ? (
            <Text className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</Text>
          ) : null}
        </View>

        {latest ? (
          <View className={`rounded-full border px-3 py-1 ${labelClass(latest)}`}>
            <Text className={`text-xs font-black ${labelClass(latest).split(" ").find((x) => x.startsWith("text-")) ?? "text-zinc-300"}`}>
              {latest.interpretation_label ?? "Latest"}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">Latest</Text>
          <Text className="mt-1 text-lg font-black text-white">
            {formatNumber(latest?.value, latest?.unit)}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">{formatDate(latest?.date)}</Text>
        </View>

        <View className="flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">Previous</Text>
          <Text className="mt-1 text-lg font-black text-zinc-200">
            {formatNumber(previous, latest?.unit)}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">prior print</Text>
        </View>

        <View className="flex-1 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500">Change</Text>
          <Text className={`mt-1 text-lg font-black ${(delta ?? 0) >= 0 ? "text-emerald-300" : "text-sky-300"}`}>
            {typeof delta === "number" ? `${delta >= 0 ? "+" : ""}${formatNumber(delta, latest?.unit)}` : "N/A"}
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">latest vs previous</Text>
        </View>
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
        <Svg width="100%" height={260} viewBox={`0 0 ${width} ${height}`}>
          <Rect x="0" y="0" width={width} height={height} fill="#18181b" />

          {[0, 1, 2, 3].map((i) => {
            const y = 24 + ((height - 58) * i) / 3;
            const value = maxValue - ((maxValue - minValue) * i) / 3;

            return (
              <React.Fragment key={i}>
                <Line x1="44" x2={width - 18} y1={y} y2={y} stroke="#3f3f46" opacity="0.55" />
                <SvgText x="6" y={y + 4} fill="#a1a1aa" fontSize="12">
                  {formatNumber(value, latest?.unit)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {path ? (
            <Path d={path} fill="none" stroke="#34d399" strokeWidth="3" />
          ) : null}

          {chartPoints.length ? (
            <Circle cx={width - 18} cy="24" r="0" fill="#34d399" />
          ) : null}
        </Svg>
      </View>

      {latest?.interpretation ? (
        <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <Text className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
            Interpretation
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-300">
            {latest.interpretation}
          </Text>
        </View>
      ) : null}
    </View>
  );
}