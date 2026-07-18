import React from "react";
import { Text, View } from "react-native";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}>
      {children}
    </View>
  );
}

export function Metric({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="min-w-[145px] flex-1 rounded-2xl bg-zinc-900 p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </Text>
      <Text className={`mt-1 text-base font-black ${valueClassName}`}>{value}</Text>
    </View>
  );
}

export function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4 mt-3">
      <Text className="mb-2 text-xs font-black uppercase tracking-[3px] text-emerald-400">
        {kicker}
      </Text>
      <Text className="text-2xl font-black text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</Text>
    </View>
  );
}

export function IntroCard({
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
          <Text className="font-black text-emerald-300">{number}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-black text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">{body}</Text>
        </View>
      </View>
    </Card>
  );
}

export function pct(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(digits)}%`;
}

export function signed(value?: number | null, suffix = " pips") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

export function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function biasClasses(bias: string) {
  const value = bias.toLowerCase();
  if (value.includes("bull")) {
    return {
      text: "text-emerald-300",
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
    };
  }
  if (value.includes("bear")) {
    return {
      text: "text-red-300",
      border: "border-red-500/40",
      bg: "bg-red-500/10",
    };
  }
  if (value.includes("range")) {
    return {
      text: "text-amber-300",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
    };
  }
  return {
    text: "text-sky-300",
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
  };
}

export function currentValue(asset: any, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = asset?.[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  return fallback;
}
