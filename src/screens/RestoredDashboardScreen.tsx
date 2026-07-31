import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppTopNav } from "../components/AppTopNav";
import { RegimeNarrativeCard } from "../components/RegimeNarrativeCard";
import { SupportProjectButton } from "../components/SupportProjectButton";
import {
  MODEL_CATALOG,
  findAssetForModel,
  modelRoute,
  type ModelDefinition,
} from "../config/modelCatalog";
import { useAuth } from "../providers/AuthProvider";
import {
  API_BASE,
  type ApiAsset,
  type CurrencyStrengthItem,
  type MarketDriver,
  type MarketState,
  fetchMarketState,
} from "../services/api";
import {
  fetchOutlookFeed,
  type OutlookArticle,
} from "../services/outlookApi";
import {
  Card,
  Metric,
  SectionTitle,
  biasClasses,
  formatTime,
  pct,
} from "./dashboard/DashboardPrimitives";
import { ModelBoardSection } from "./dashboard/ModelBoardSection";

function directionalArrow(value?: string | null) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("bull")) return "↗";
  if (text.includes("bear")) return "↘";
  return "→";
}

function formatPublishedAt(value?: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SnapshotCard({
  kicker,
  title,
  body,
  accent,
  badge,
  onPress,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  accent: "sky" | "emerald" | "violet";
  badge?: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const palette = {
    sky: {
      border: "#0c4a6e",
      background: "#071820",
      kicker: "#7dd3fc",
      badgeBackground: "#082f49",
    },
    emerald: {
      border: "#064e3b",
      background: "#061713",
      kicker: "#6ee7b7",
      badgeBackground: "#022c22",
    },
    violet: {
      border: "#4c1d95",
      background: "#120b20",
      kicker: "#c4b5fd",
      badgeBackground: "#2e1065",
    },
  }[accent];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.snapshotCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.snapshotTopRow}>
        <Text style={[styles.snapshotKicker, { color: palette.kicker }]}>
          {kicker}
        </Text>
        {badge ? (
          <View style={[styles.snapshotBadge, { backgroundColor: palette.badgeBackground }]}>
            <Text style={styles.snapshotBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.snapshotTitle}>{title}</Text>
      <Text style={styles.snapshotBody}>{body}</Text>
      {children}
      <Text style={[styles.snapshotLink, { color: palette.kicker }]}>Open →</Text>
    </Pressable>
  );
}

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

function CurrencyBar({ item, index }: { item: CurrencyStrengthItem; index: number }) {
  const safeScore = Math.max(0, Math.min(100, Number(item.score) || 0));
  const bullish = String(item.bias).toLowerCase().includes("bull");
  const bearish = String(item.bias).toLowerCase().includes("bear");
  const fill = bullish ? "#34d399" : bearish ? "#fb7185" : "#38bdf8";

  return (
    <View style={styles.currencyRow}>
      <View style={styles.currencyHeader}>
        <View style={styles.currencyIdentity}>
          <Text style={styles.currencyRank}>#{index + 1}</Text>
          <View>
            <Text style={styles.currencyCode}>{item.code}</Text>
            <Text style={styles.currencyName}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.currencyValueWrap}>
          <Text style={styles.currencyValue}>{Math.round(safeScore)}/100</Text>
          <Text style={styles.currencyBias}>{item.bias}</Text>
        </View>
      </View>
      <View style={styles.currencyTrack}>
        <View
          style={[
            styles.currencyFill,
            { width: `${safeScore}%` as any, backgroundColor: fill },
          ]}
        />
      </View>
      <Text style={styles.currencyNote}>{item.note}</Text>
    </View>
  );
}

function LatestSignalRow({
  model,
  asset,
  locked,
}: {
  model: ModelDefinition;
  asset?: ApiAsset;
  locked: boolean;
}) {
  const raw = asset as any;
  const bias = String(raw?.bias ?? "Neutral");
  const classes = locked
    ? { text: "text-violet-300", border: "border-violet-500/40", bg: "bg-violet-500/10" }
    : biasClasses(bias);

  return (
    <View style={styles.latestSignalRow}>
      <View style={styles.latestSignalIdentity}>
        <Text className={`text-3xl font-black ${classes.text}`}>
          {locked ? "◇" : directionalArrow(bias)}
        </Text>
        <View style={styles.latestSignalCopy}>
          <Text style={styles.latestSignalName}>{model.shortName}</Text>
          <Text style={styles.latestSignalMeta}>
            {locked
              ? "Direction and confidence locked"
              : `${bias} · ${pct(raw?.confidence, 0)} confidence`}
          </Text>
        </View>
      </View>
      <View className={`rounded-full border px-3 py-1 ${classes.border} ${classes.bg}`}>
        <Text className={`text-[10px] font-black ${classes.text}`}>
          {locked ? "PRO" : bias.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

export default function RestoredDashboardScreen() {
  const {
    isAuthenticated,
    hasModelsAccess,
    hasOutlookAccess,
  } = useAuth();

  const [market, setMarket] = useState<MarketState | null>(null);
  const [latestOutlook, setLatestOutlook] = useState<OutlookArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const [marketResult, outlookResult] = await Promise.all([
        fetchMarketState(),
        fetchOutlookFeed(hasOutlookAccess),
      ]);
      setMarket(marketResult);
      setLatestOutlook(outlookResult.outlooks[0] ?? null);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasOutlookAccess]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const selectedSignals = useMemo(() => {
    const assets = market?.assets ?? [];
    return MODEL_CATALOG.slice(0, 3).map((model) => ({
      model,
      asset: findAssetForModel(model, assets),
    }));
  }, [market?.assets]);

  const strongest = market?.currencyStrength?.[0];
  const weakest = market?.currencyStrength?.length
    ? market.currencyStrength[market.currencyStrength.length - 1]
    : undefined;
  const regime = market?.regimeLabel ?? market?.activeRegime ?? (loading ? "Loading" : "Unavailable");
  const accountLabel = !isAuthenticated
    ? "Create free account"
    : hasModelsAccess && hasOutlookAccess
      ? "Complete access"
      : hasModelsAccess
        ? "Models access"
        : hasOutlookAccess
          ? "Outlook access"
          : "Free account";

  return (
    <SafeAreaView
      style={[
        styles.page,
        Platform.OS === "web" ? ({ height: "100vh" } as any) : null,
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }
      >
        <AppTopNav />

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <View style={styles.livePill}>
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.45, 1],
                    }),
                    transform: [
                      {
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.85, 1.15],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={styles.livePillText}>LIVE MARKET INTELLIGENCE</Text>
            </View>
            <Text style={styles.heroTitle}>Know the regime. Confirm the direction.</Text>
            <Text style={styles.heroBody}>
              One dashboard for cross-asset context, trader-led outlooks and transparent
              model signals. Less chart decoration, more evidence.
            </Text>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push((isAuthenticated ? "/account" : "/login") as never)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{accountLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>View plans</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.snapshotGrid}>
          <SnapshotCard
            kicker="MARKET REGIME"
            title={regime}
            body={market?.regimeExplanation ?? "Cross-asset state is being refreshed."}
            accent="emerald"
            badge={typeof market?.riskScore === "number" ? `${Math.round(market.riskScore)}% risk score` : "Hourly"}
            onPress={() => router.push("/macro" as never)}
          >
            <View style={styles.inlineMetrics}>
              <View style={styles.inlineMetric}>
                <Text style={styles.inlineMetricLabel}>Strongest</Text>
                <Text style={styles.inlineMetricValue}>{strongest?.code ?? "N/A"}</Text>
              </View>
              <View style={styles.inlineMetric}>
                <Text style={styles.inlineMetricLabel}>Weakest</Text>
                <Text style={styles.inlineMetricValue}>{weakest?.code ?? "N/A"}</Text>
              </View>
            </View>
          </SnapshotCard>

          <SnapshotCard
            kicker="LATEST OUTLOOK"
            title={latestOutlook?.title ?? "No publication yet"}
            body={
              latestOutlook?.preview?.[0] ??
              "The latest macro, fundamental and technical thesis will appear here."
            }
            accent="sky"
            badge={hasOutlookAccess ? "FULL ACCESS" : "PREVIEW"}
            onPress={() => router.push((hasOutlookAccess ? "/outlook" : "/pricing") as never)}
          >
            <Text style={styles.snapshotMeta}>
              {latestOutlook
                ? `${latestOutlook.author} · ${formatPublishedAt(latestOutlook.publishedAt)}`
                : "Awaiting publication"}
            </Text>
            {!hasOutlookAccess ? (
              <View style={styles.lockNotice}>
                <Text style={styles.lockNoticeText}>Subscribe to read the complete thesis and archive.</Text>
              </View>
            ) : null}
          </SnapshotCard>

          <SnapshotCard
            kicker="LATEST PREDICTIONS"
            title="Current directional reads"
            body="The newest threshold-approved model signals, their confidence and live status."
            accent="violet"
            badge={hasModelsAccess ? "LIVE" : "PRO LOCKED"}
            onPress={() => router.push((hasModelsAccess ? "/performance" : "/pricing") as never)}
          >
            <View style={styles.latestSignals}>
              {selectedSignals.map(({ model, asset }) => (
                <LatestSignalRow
                  key={model.modelKey}
                  model={model}
                  asset={asset}
                  locked={model.tier === "Pro" && !hasModelsAccess}
                />
              ))}
            </View>
          </SnapshotCard>
        </View>

        <View style={styles.trustStrip}>
          <View style={styles.trustItem}>
            <Text style={styles.trustValue}>6</Text>
            <Text style={styles.trustLabel}>Selected products</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustValue}>100%</Text>
            <Text style={styles.trustLabel}>Stored predictions</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustValue}>0</Text>
            <Text style={styles.trustLabel}>Deleted losses</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustValue}>Hourly</Text>
            <Text style={styles.trustLabel}>Market refresh</Text>
          </View>
        </View>

        {error ? (
          <Card className="mb-5 border-red-500/40 bg-red-500/10">
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

        <SectionTitle
          kicker="FX RELATIVE STRENGTH"
          title="Where capital pressure is visible"
          subtitle="Ranked currency strength helps separate a broad flow from a pair-specific move."
        />
        <View style={styles.currencyGrid}>
          {market?.currencyStrength?.length ? (
            market.currencyStrength.map((item, index) => (
              <CurrencyBar key={item.code} item={item} index={index} />
            ))
          ) : (
            <Card className="mb-5">
              <Text className="text-sm text-zinc-400">Currency-strength data is loading.</Text>
            </Card>
          )}
        </View>

        <ModelBoardSection
          assets={market?.assets ?? []}
          userIsPro={Boolean(hasModelsAccess)}
        />

        <View style={styles.performanceCta}>
          <View style={styles.performanceCtaCopy}>
            <Text style={styles.performanceKicker}>TRANSPARENT PERFORMANCE</Text>
            <Text style={styles.performanceTitle}>Correct, incorrect, pending and live pips.</Text>
            <Text style={styles.performanceBody}>
              Forecast accuracy and trade-management outcomes are shown separately. No
              prediction disappears because the market developed a personality.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push((hasModelsAccess ? "/performance" : "/pricing") as never)}
            style={({ pressed }) => [styles.performanceButton, pressed && styles.pressed]}
          >
            <Text style={styles.performanceButtonText}>
              {hasModelsAccess ? "Open performance" : "Unlock performance"}
            </Text>
          </Pressable>
        </View>

        <SectionTitle
          kicker="CROSS-ASSET"
          title="Current market drivers"
          subtitle="Rates, volatility, equities, metals and defensive demand describe the environment around every forecast."
        />
        {market?.drivers?.length ? (
          market.drivers.map((driver) => <DriverCard key={driver.key} item={driver} />)
        ) : (
          <Card className="mb-5">
            <Text className="text-sm text-zinc-400">Cross-asset drivers are loading.</Text>
          </Card>
        )}

        {market ? <RegimeNarrativeCard data={market} /> : null}

        <View style={styles.methodCard}>
          <Text style={styles.methodKicker}>HOW THE PLATFORM FITS TOGETHER</Text>
          <View style={styles.methodGrid}>
            <View style={styles.methodItem}>
              <Text style={styles.methodNumber}>01</Text>
              <Text style={styles.methodTitle}>Context</Text>
              <Text style={styles.methodBody}>Risk regime, capital flows, rates and relative currency strength.</Text>
            </View>
            <View style={styles.methodItem}>
              <Text style={styles.methodNumber}>02</Text>
              <Text style={styles.methodTitle}>Human thesis</Text>
              <Text style={styles.methodBody}>Fundamental and technical outlook with scenarios and invalidation.</Text>
            </View>
            <View style={styles.methodItem}>
              <Text style={styles.methodNumber}>03</Text>
              <Text style={styles.methodTitle}>Model confirmation</Text>
              <Text style={styles.methodBody}>Directional signals, confidence, live tracking and recorded outcomes.</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerMeta}>
          <Metric label="Data source" value={API_BASE} />
          <Metric label="Last market data" value={formatTime(market?.marketDataTimeUTC ?? market?.generatedAt)} />
        </View>

        <View style={styles.supportWrap}>
          <SupportProjectButton />
        </View>

        <Text style={styles.disclaimer}>
          Educational decision support only. Historical and live performance do not guarantee future results.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#050505",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1220,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  pressed: {
    opacity: 0.7,
  },
  hero: {
    marginBottom: 26,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 24,
  },
  heroCopy: {
    flex: 1,
    minWidth: 280,
    maxWidth: 760,
  },
  livePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#064e3b",
    borderRadius: 999,
    backgroundColor: "#061713",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#34d399",
  },
  livePillText: {
    color: "#6ee7b7",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  heroTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 48,
    lineHeight: 55,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  heroBody: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 17,
    lineHeight: 28,
  },
  heroActions: {
    minWidth: 210,
    gap: 10,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 16,
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 16,
    backgroundColor: "#0c0c0e",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#d4d4d8",
    fontWeight: "900",
  },
  snapshotGrid: {
    marginBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  snapshotCard: {
    flexGrow: 1,
    flexBasis: 330,
    minHeight: 300,
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
  },
  snapshotTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  snapshotKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  snapshotBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  snapshotBadgeText: {
    color: "#f4f4f5",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  snapshotTitle: {
    marginTop: 17,
    color: "#ffffff",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
  },
  snapshotBody: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  snapshotMeta: {
    marginTop: 16,
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "800",
  },
  snapshotLink: {
    marginTop: "auto",
    paddingTop: 18,
    fontSize: 13,
    fontWeight: "900",
  },
  inlineMetrics: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  inlineMetric: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1f3d34",
    borderRadius: 15,
    backgroundColor: "#07110e",
    padding: 12,
  },
  inlineMetricLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inlineMetricValue: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  lockNotice: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 14,
    backgroundColor: "#1e1b4b",
    padding: 11,
  },
  lockNoticeText: {
    color: "#ddd6fe",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
  },
  latestSignals: {
    marginTop: 15,
    gap: 8,
  },
  latestSignalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#2b2238",
    borderRadius: 16,
    backgroundColor: "#0d0914",
    padding: 11,
  },
  latestSignalIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  latestSignalCopy: {
    flex: 1,
  },
  latestSignalName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  latestSignalMeta: {
    marginTop: 4,
    color: "#71717a",
    fontSize: 10,
  },
  trustStrip: {
    marginBottom: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 12,
  },
  trustItem: {
    flexGrow: 1,
    flexBasis: 150,
    borderRightWidth: 1,
    borderRightColor: "#202026",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trustValue: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },
  trustLabel: {
    marginTop: 4,
    color: "#71717a",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  currencyGrid: {
    marginBottom: 26,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  currencyRow: {
    flexGrow: 1,
    flexBasis: 350,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 22,
    backgroundColor: "#0c0c0e",
    padding: 16,
  },
  currencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  currencyRank: {
    width: 34,
    height: 34,
    color: "#a1a1aa",
    textAlign: "center",
    textAlignVertical: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 11,
    backgroundColor: "#18181b",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 32,
  },
  currencyCode: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  currencyName: {
    marginTop: 2,
    color: "#71717a",
    fontSize: 10,
  },
  currencyValueWrap: {
    alignItems: "flex-end",
  },
  currencyValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  currencyBias: {
    marginTop: 2,
    color: "#71717a",
    fontSize: 10,
  },
  currencyTrack: {
    height: 8,
    marginTop: 14,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#27272a",
  },
  currencyFill: {
    height: "100%",
    borderRadius: 999,
  },
  currencyNote: {
    marginTop: 11,
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
  },
  performanceCta: {
    marginVertical: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 26,
    backgroundColor: "#120b20",
    padding: 22,
  },
  performanceCtaCopy: {
    flex: 1,
    minWidth: 260,
  },
  performanceKicker: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  performanceTitle: {
    marginTop: 9,
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  performanceBody: {
    marginTop: 9,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  performanceButton: {
    minWidth: 190,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 17,
    backgroundColor: "#6d28d9",
    paddingHorizontal: 18,
  },
  performanceButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  methodCard: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 26,
    backgroundColor: "#09090b",
    padding: 22,
  },
  methodKicker: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  methodGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  methodItem: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 20,
    backgroundColor: "#0c0c0e",
    padding: 17,
  },
  methodNumber: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  methodTitle: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  methodBody: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 21,
  },
  footerMeta: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  supportWrap: {
    marginTop: 25,
  },
  disclaimer: {
    marginTop: 24,
    color: "#52525b",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
});
