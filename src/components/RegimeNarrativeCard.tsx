import React from "react";
import { Text, View } from "react-native";

import { MarketState, RegimeNarrative } from "../services/api";

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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1">
      <Text className="text-xs font-semibold text-zinc-300">{children}</Text>
    </View>
  );
}

function BulletList({ items }: { items?: string[] }) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!rows.length) return null;

  return (
    <View className="mt-2 gap-2">
      {rows.map((item, index) => (
        <View key={`${item}-${index}`} className="flex-row gap-2">
          <Text className="mt-[2px] text-xs text-emerald-300">•</Text>
          <Text className="flex-1 text-sm leading-6 text-zinc-300">{item}</Text>
        </View>
      ))}
    </View>
  );
}

function scoreTone(score?: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "text-zinc-300";
  if (score > 0.35) return "text-emerald-300";
  if (score < -0.35) return "text-red-300";
  return "text-zinc-300";
}

export function RegimeNarrativeCard({ data }: { data: MarketState }) {
  const narrative: RegimeNarrative | undefined = data.regimeNarrative;

  const headline =
    narrative?.headline ?? data.regimeLabel ?? data.activeRegime ?? "Mixed market regime";

  const confidence =
    typeof narrative?.confidence === "number"
      ? narrative.confidence
      : typeof data.regimeConfidence === "number"
      ? data.regimeConfidence
      : undefined;

  const observed =
    narrative?.observed ??
    data.regimeExplanation ??
    "The current market regime is derived from currency strength, cross-asset drivers, volatility, rates, metals and broader risk appetite.";

  return (
    <Card className="mb-6 border-emerald-500/30 bg-emerald-500/10">
      <Text className="text-xs font-black uppercase tracking-[3px] text-emerald-300">
        Professional regime interpretation
      </Text>

      <Text className="mt-3 text-2xl font-black text-white">{headline}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pill>
          Confidence: {typeof confidence === "number" ? `${Math.round(confidence)}%` : "N/A"}
        </Pill>
        {typeof narrative?.disagreement === "number" ? (
          <Pill>Disagreement: {Math.round(narrative.disagreement)}%</Pill>
        ) : null}
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-zinc-500">
          Observed pattern
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-300">{observed}</Text>
      </View>

      <View className="mt-5">
        <Text className="text-sm font-black text-white">Possible macro backdrop</Text>
        <BulletList items={narrative?.possibleDrivers} />
      </View>

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <Text className="text-xs font-black uppercase tracking-[2px] text-emerald-300">
            Likely beneficiaries
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(narrative?.likelyBeneficiaries ?? ["Selective relative-strength setups"]).map((x) => (
              <Pill key={x}>{x}</Pill>
            ))}
          </View>
        </View>

        <View className="flex-1 rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
          <Text className="text-xs font-black uppercase tracking-[2px] text-red-300">
            Likely headwinds
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(narrative?.likelyHeadwinds ?? ["Forcing trades without confirmation"]).map((x) => (
              <Pill key={x}>{x}</Pill>
            ))}
          </View>
        </View>
      </View>

      {narrative?.dominantDrivers?.length ? (
        <View className="mt-5">
          <Text className="text-sm font-black text-white">Dominant observed drivers</Text>
          <View className="mt-3 gap-2">
            {narrative.dominantDrivers.map((driver) => (
              <View
                key={driver.key}
                className="flex-row items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <Text className="flex-1 text-sm font-semibold text-zinc-300">
                  {driver.label}
                </Text>
                <Text className={`text-sm font-black ${scoreTone(driver.score)}`}>
                  {driver.score > 0 ? "+" : ""}
                  {driver.score.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {narrative?.howToUse ? (
        <View className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
          <Text className="text-xs font-black uppercase tracking-[2px] text-sky-300">
            How to read it
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-300">{narrative.howToUse}</Text>
        </View>
      ) : null}

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
          Method note
        </Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-400">
          {narrative?.methodNote ??
            "The app describes the observed market pattern. It does not claim to know the single true macro cause behind the move."}
        </Text>
        <BulletList items={narrative?.blindSpots} />
      </View>
    </Card>
  );
}
