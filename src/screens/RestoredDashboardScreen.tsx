import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  API_BASE,
  type CurrencyStrengthItem,
  type MarketDriver,
  type MarketState,
  fetchMarketState,
} from "../services/api";
import { useAuth } from "../providers/AuthProvider";
import { SupportProjectButton } from "../components/SupportProjectButton";
import { RegimeNarrativeCard } from "../components/RegimeNarrativeCard";
import {
  Card,
  IntroCard,
  Metric,
  SectionTitle,
  biasClasses,
  formatTime,
  pct,
} from "./dashboard/DashboardPrimitives";
import { MODEL_COUNTS, ModelBoardSection } from "./dashboard/ModelBoardSection";

function DriverCard({ item }: { item: MarketDriver }) {
  const classes = biasClasses(`${item.state} ${item.title}`);
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-black text-white">{item.title}</Text>
          <Text className={`mt-1 text-sm font-black ${classes.text}`}>{item.state}</Text>
        </View>
        <Text className="text-lg font-black text-white">
          {typeof item.strength === "number" ? pct(item.strength, 0) : "N/A"}
        </Text>
      </View>
      <Text className="mt-3 text-sm leading-6 text-zinc-400">{item.detail}</Text>
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
          <Text className="text-base font-black text-white">{Math.round(item.score)}/100</Text>
          <Text className="text-xs text-zinc-500">{item.bias}</Text>
        </View>
      </View>
      <Text className="mt-3 text-sm leading-6 text-zinc-400">{item.note}</Text>
    </View>
  );
}

export default function RestoredDashboardScreen() {
  const { isAuthenticated, isPro } = useAuth();
  const [market, setMarket] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setMarket(await fetchMarketState());
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={Platform.OS === "web" ? ({ height: "100vh" } as any) : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }
      >
        <View className="mb-6">
          <View className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
            <Text className="text-xs font-black uppercase tracking-[2px] text-emerald-300">
              Public beta
            </Text>
          </View>

          <Text className="mt-4 text-xs font-black uppercase tracking-[4px] text-emerald-400">
            AI Market Expert
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Cross-Asset Bias, Sentiment & Probabilistic Forecasts
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Markets are not isolated charts. They are connected flows of capital moving between
            currencies, equities, volatility, government yields, metals and defensive assets.
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
              <Text className="text-xs font-black text-zinc-300">
                {MODEL_COUNTS.total} model views
              </Text>
            </View>
            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <Text className="text-xs font-black text-emerald-300">
                {MODEL_COUNTS.free} Free
              </Text>
            </View>
            <View className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-2">
              <Text className="text-xs font-black text-violet-300">
                {MODEL_COUNTS.pro} Pro
              </Text>
            </View>
            <View className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-2">
              <Text className="text-xs font-black text-violet-200">€24.99/month</Text>
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap gap-3">
            <Pressable
              onPress={() =>
                router.push((isAuthenticated ? "/account" : "/login") as never)
              }
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 active:opacity-70"
            >
              <Text className="font-black text-emerald-300">
                {isAuthenticated
                  ? isPro
                    ? "Pro account"
                    : "Free account"
                  : "Sign in / Create account"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/macro" as never)}
              className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 active:opacity-70"
            >
              <Text className="font-black text-sky-300">Macro intelligence</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/pricing" as never)}
              className="rounded-2xl border border-violet-500/40 bg-violet-500/10 px-5 py-3 active:opacity-70"
            >
              <Text className="font-black text-violet-300">View plans</Text>
            </Pressable>
          </View>

          <Text className="mt-4 text-xs text-zinc-500">
            Market data: {formatTime(market?.marketDataTimeUTC ?? market?.generatedAt)}
          </Text>
        </View>

        <SectionTitle
          kicker="How it works"
          title="A wider market view before a forecast"
          subtitle="The platform combines model predictions with the environment in which those predictions are being made."
        />
        <IntroCard
          number="1"
          title="Cross-Asset Intelligence"
          body="The models do not analyse a currency pair in isolation. They interpret relative currency strength, equities, volatility, rates, metals and risk appetite as parts of one connected capital-flow system."
        />
        <IntroCard
          number="2"
          title="Probabilistic Models"
          body="Each forecast estimates direction, expected movement and a possible range. The projection is uncertainty-aware, not a promise that price will follow one exact line."
        />
        <IntroCard
          number="3"
          title="High-Impact Event Awareness"
          body="CPI, NFP, central-bank decisions, geopolitical escalation and trade-policy shocks can abruptly change the market regime. The next model output must be interpreted inside the newly formed environment."
        />

        <Card className="mb-6 border-sky-500/30 bg-sky-500/10">
          <Text className="text-xs font-black uppercase tracking-[3px] text-sky-300">
            The underlying idea
          </Text>
          <Text className="mt-2 text-xl font-black text-white">
            Fundamentals create pressure. Capital flows express it through price.
          </Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-300">
            Macro fundamentals, positioning, liquidity and technical structure influence how capital
            moves between asset classes. The goal is not certainty. It is a more informed decision
            process as the environment changes.
          </Text>
        </Card>

        <Card className="mb-5 border-emerald-500/25 bg-emerald-500/5">
          <Text className="text-xs font-black uppercase tracking-[3px] text-emerald-300">
            Active regime
          </Text>
          <Text className="mt-2 text-2xl font-black text-white">
            {market?.regimeLabel ?? market?.activeRegime ?? (loading ? "Loading" : "Unavailable")}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <Metric
              label="Risk score"
              value={
                typeof market?.riskScore === "number"
                  ? `${Math.round(market.riskScore)}%`
                  : "N/A"
              }
            />
            <Metric label="Refresh" value="Hourly" />
            <Metric label="Data source" value={API_BASE} />
          </View>
          {market?.regimeExplanation ? (
            <Text className="mt-4 text-sm leading-6 text-zinc-400">
              {market.regimeExplanation}
            </Text>
          ) : null}
        </Card>

        {market ? <RegimeNarrativeCard data={market} /> : null}

        {error ? (
          <Card className="mb-4 border-red-500/40 bg-red-500/10">
            <Text className="font-black text-red-300">Market data error</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-300">{error}</Text>
            <Pressable
              onPress={() => void load()}
              className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3"
            >
              <Text className="text-center font-black text-red-200">Retry</Text>
            </Pressable>
          </Card>
        ) : null}

        <ModelBoardSection assets={market?.assets ?? []} userIsPro={Boolean(isPro)} />

        <SectionTitle
          kicker="Cross-asset"
          title="Market drivers"
          subtitle="Rates, equities, volatility, metals, USD pressure and defensive flows describe the environment around every forecast."
        />
        {market?.drivers?.length ? (
          market.drivers.map((driver) => <DriverCard key={driver.key} item={driver} />)
        ) : (
          <Card className="mb-5">
            <Text className="text-sm text-zinc-400">Cross-asset drivers are loading.</Text>
          </Card>
        )}

        <SectionTitle
          kicker="FX"
          title="Currency strength"
          subtitle="Relative strength helps distinguish a pair-specific move from a broad currency flow."
        />
        {market?.currencyStrength?.length ? (
          market.currencyStrength.map((item, index) => (
            <CurrencyRow key={item.code} item={item} index={index} />
          ))
        ) : (
          <Card className="mb-5">
            <Text className="text-sm text-zinc-400">Currency-strength data is loading.</Text>
          </Card>
        )}

        <View className="mt-7">
          <SupportProjectButton />
        </View>

        <Text className="mt-6 text-center text-xs leading-5 text-zinc-600">
          Decision support only. Evaluation accuracy is not live accuracy, and neither is a guarantee
          of future performance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
