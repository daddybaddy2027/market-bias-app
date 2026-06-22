import React from "react";
import { Text, View } from "react-native";

import { ApiAsset, MarketState } from "../services/api";

function Card({
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

function tone(alignment?: string) {
  const value = String(alignment ?? "").toLowerCase();
  if (value.includes("aligned")) return "text-emerald-300";
  if (value.includes("conflict")) return "text-red-300";
  return "text-sky-300";
}

export function PairContextCard({
  asset,
  marketState,
}: {
  asset: ApiAsset;
  marketState?: MarketState | null;
}) {
  const bullets = Array.isArray(asset.contextBullets)
    ? asset.contextBullets.filter(Boolean)
    : [];

  const hasContext =
    asset.macroContextShort ||
    asset.macroContextLong ||
    bullets.length ||
    marketState?.regimeNarrative?.headline;

  if (!hasContext) return null;

  return (
    <Card className="mb-5 border-sky-500/30 bg-sky-500/10">
      <Text className="text-xs font-black uppercase tracking-[3px] text-sky-300">
        Pair vs market regime
      </Text>

      <Text className="mt-3 text-xl font-black text-white">
        {asset.regimeAlignment ?? "Mixed"} context
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          <Text className={`text-xs font-black ${tone(asset.regimeAlignment)}`}>
            Alignment: {asset.regimeAlignment ?? "Mixed"}
          </Text>
        </View>

        <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
          <Text className="text-xs font-black text-zinc-300">
            Conflict: {asset.regimeConflictLevel ?? "Medium"}
          </Text>
        </View>

        {typeof asset.pairStrengthSpread === "number" ? (
          <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
            <Text className="text-xs font-black text-zinc-300">
              Strength spread: {asset.pairStrengthSpread.toFixed(2)}
            </Text>
          </View>
        ) : null}
      </View>

      {asset.macroContextShort ? (
        <Text className="mt-4 text-sm font-semibold leading-6 text-zinc-200">
          {asset.macroContextShort}
        </Text>
      ) : null}

      {asset.macroContextLong ? (
        <Text className="mt-2 text-sm leading-6 text-zinc-400">
          {asset.macroContextLong}
        </Text>
      ) : null}

      {bullets.length ? (
        <View className="mt-4 gap-2">
          {bullets.map((item, index) => (
            <View key={`${item}-${index}`} className="flex-row gap-2">
              <Text className="mt-[2px] text-xs text-sky-300">•</Text>
              <Text className="flex-1 text-sm leading-6 text-zinc-300">{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
          Important
        </Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-400">
          This is a context layer. It helps decide whether the pair is worth watching, but it is not an automatic trade signal.
        </Text>
      </View>
    </Card>
  );
}
