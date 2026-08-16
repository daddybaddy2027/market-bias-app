import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppTopNav } from "../components/AppTopNav";
import { XauCandlestickChart } from "../components/XauCandlestickChart";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchXauBotSnapshot,
  type XauBotEquityPoint,
  type XauBotSnapshot,
  type XauBotTimeframe,
  type XauBotTrade,
} from "../services/xauBotApi";

const REFRESH_MS = 30_000;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function money(value: number | null | undefined) {
  if (!finite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function plainMoney(value: number | null | undefined) {
  if (!finite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function signed(value: number | null | undefined, digits = 1) {
  if (!finite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function pct(value: number | null | undefined) {
  if (!finite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function time(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "good" | "bad" | "cyan" | "amber";
}) {
  const valueColor =
    tone === "good"
      ? "#6ee7b7"
      : tone === "bad"
        ? "#fda4af"
        : tone === "cyan"
          ? "#67e8f9"
          : tone === "amber"
            ? "#fde68a"
            : "#ffffff";

  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

function EquityCurve({ points }: { points: XauBotEquityPoint[] }) {
  const width = 700;
  const height = 150;
  const visible = points.slice(-240);

  if (visible.length < 2) {
    return (
      <View style={styles.equityEmpty}>
        <Text style={styles.muted}>Equity curve starts with the first live shadow cycle.</Text>
      </View>
    );
  }

  const values = visible.map((point) => point.equity_usd).filter(finite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  const step = width / Math.max(1, visible.length - 1);

  const d = visible
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point.equity_usd - min) / range) * (height - 20) - 10;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <View style={styles.equityChart}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={d} fill="none" stroke="#38bdf8" strokeWidth="2.3" />
      </Svg>
      <View style={styles.equityFooter}>
        <Text style={styles.muted}>Low {plainMoney(min)}</Text>
        <Text style={styles.muted}>High {plainMoney(max)}</Text>
      </View>
    </View>
  );
}

function PositionCard({ trade }: { trade: XauBotTrade }) {
  const long = trade.side === 1;
  return (
    <View style={styles.positionCard}>
      <View style={styles.rowBetween}>
        <View style={[styles.sideBadge, long ? styles.buyBadge : styles.sellBadge]}>
          <Text style={[styles.sideText, { color: long ? "#67e8f9" : "#fbbf24" }]}>
            {long ? "BUY" : "SELL"}
          </Text>
        </View>
        <Text style={styles.routeText}>{trade.route.replaceAll("_", " ")}</Text>
      </View>
      <View style={styles.positionPriceRow}>
        <View>
          <Text style={styles.microLabel}>ENTRY</Text>
          <Text style={styles.positionPrice}>{trade.entry_price.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.microLabel}>SL</Text>
          <Text style={[styles.positionPrice, { color: "#fda4af" }]}>{trade.sl_price.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.microLabel}>TP</Text>
          <Text style={[styles.positionPrice, { color: "#86efac" }]}>{trade.tp_price.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={styles.positionMeta}>
        0.01 lot · opened {time(trade.entry_time)} · move {trade.move_id ?? "—"}
      </Text>
    </View>
  );
}

function TradeHistoryRow({ trade }: { trade: XauBotTrade }) {
  const long = trade.side === 1;
  const positive = finite(trade.pnl_usd) && trade.pnl_usd >= 0;
  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeIdentity}>
        <Text style={[styles.tradeSide, { color: long ? "#67e8f9" : "#fbbf24" }]}>
          {long ? "BUY" : "SELL"}
        </Text>
        <Text style={styles.tradeRoute}>{trade.route.replaceAll("_", " ")}</Text>
      </View>
      <View style={styles.tradeCell}>
        <Text style={styles.microLabel}>ENTRY</Text>
        <Text style={styles.tradeValue}>{trade.entry_price.toFixed(2)}</Text>
      </View>
      <View style={styles.tradeCell}>
        <Text style={styles.microLabel}>EXIT</Text>
        <Text style={styles.tradeValue}>{finite(trade.exit_price) ? trade.exit_price.toFixed(2) : "OPEN"}</Text>
      </View>
      <View style={styles.tradeCell}>
        <Text style={styles.microLabel}>R</Text>
        <Text style={[styles.tradeValue, { color: positive ? "#6ee7b7" : "#fda4af" }]}>
          {signed(trade.r_result, 2)}
        </Text>
      </View>
      <View style={styles.tradeCell}>
        <Text style={styles.microLabel}>P/L</Text>
        <Text style={[styles.tradeValue, { color: positive ? "#6ee7b7" : "#fda4af" }]}>
          {money(trade.pnl_usd)}
        </Text>
      </View>
      <View style={styles.tradeCell}>
        <Text style={styles.microLabel}>PIPS</Text>
        <Text style={styles.tradeValue}>{signed(trade.pips, 1)}</Text>
      </View>
      <View style={styles.tradeReason}>
        <Text style={styles.microLabel}>EXIT</Text>
        <Text style={styles.tradeValue}>{trade.exit_reason ?? trade.status}</Text>
      </View>
    </View>
  );
}

export default function XauBotScreen() {
  const { hasModelsAccess, initializing, profileLoading } = useAuth();
  const [timeframe, setTimeframe] = useState<XauBotTimeframe>("M15");
  const [snapshot, setSnapshot] = useState<XauBotSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!hasModelsAccess) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      quiet ? setRefreshing(true) : setLoading(true);
      try {
        const next = await fetchXauBotSnapshot(timeframe);
        setSnapshot(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasModelsAccess, timeframe]
  );

  useEffect(() => {
    void load(false);
    if (!hasModelsAccess) return;
    const id = setInterval(() => void load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [hasModelsAccess, load]);

  const state = snapshot?.state;
  const trades = snapshot?.trades ?? [];
  const openTrades = useMemo(
    () => trades.filter((trade) => String(trade.status).toLowerCase() === "open"),
    [trades]
  );
  const closedTrades = useMemo(
    () => trades.filter((trade) => String(trade.status).toLowerCase() !== "open"),
    [trades]
  );

  if (initializing || profileLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.muted}>Checking Pro access…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasModelsAccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <AppTopNav />
          <View style={styles.lockCard}>
            <Text style={styles.eyebrow}>PRO · XAUUSD LIVE SHADOW</Text>
            <Text style={styles.lockTitle}>Gold PA Bot</Text>
            <Text style={styles.lockCopy}>
              The live structural execution board is available to Models / Pro subscribers. It tracks
              the paper account, open positions, 15m and 1h structure, equity and verified trade history.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <AppTopNav />

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <View style={styles.heroTopline}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrow}>XAUUSD · LIVE SHADOW · PAPER</Text>
            </View>
            <Text style={styles.title}>Structural Gold Bot</Text>
            <Text style={styles.subtitle}>
              TABULAR · H1 2-WAY · no short-aligned M15 · maximum 3 open positions. The model proposes
              direction; price structure decides whether a trade exists.
            </Text>
          </View>
          <View style={styles.heroStatus}>
            <Text style={styles.microLabel}>BOT STATUS</Text>
            <Text style={styles.heroStatusValue}>{state?.status ?? "INITIALIZING"}</Text>
            <Text style={styles.heroStatusMeta}>Updated {time(state?.updated_at)} {refreshing ? "· refreshing" : ""}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Shadow feed unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>This page is isolated from the existing model board; current models are unaffected.</Text>
          </View>
        ) : null}

        {loading && !snapshot ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.muted}>Loading live bot state…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="EQUITY" value={plainMoney(state?.equity_usd)} note={`Started at ${plainMoney(state?.starting_balance_usd ?? 500)}`} tone="cyan" />
              <StatCard label="NET P/L" value={money(state?.realized_pnl_usd)} note={`${state?.total_trades ?? 0} closed trades`} tone={(state?.realized_pnl_usd ?? 0) >= 0 ? "good" : "bad"} />
              <StatCard label="WIN RATE" value={pct(state?.win_rate)} note={`${state?.wins ?? 0} wins · ${state?.losses ?? 0} losses`} />
              <StatCard label="OPEN" value={`${state?.open_positions ?? openTrades.length}/${state?.max_open_positions ?? 3}`} note="portfolio cap" tone="amber" />
              <StatCard label="MAX DRAWDOWN" value={money(state?.max_drawdown_usd)} note={pct(state?.max_drawdown_pct)} tone="bad" />
              <StatCard label="TOTAL PIPS" value={signed(state?.total_pips, 1)} note={`Best trade ${money(state?.best_trade_usd)}`} tone={(state?.total_pips ?? 0) >= 0 ? "good" : "bad"} />
            </View>

            <View style={styles.mainGrid}>
              <View style={styles.chartCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>PRICE ACTION</Text>
                    <Text style={styles.sectionTitle}>XAUUSD execution chart</Text>
                  </View>
                  <View style={styles.timeframeWrap}>
                    {(["M15", "H1"] as XauBotTimeframe[]).map((item) => (
                      <Pressable key={item} onPress={() => setTimeframe(item)} style={[styles.timeframeButton, timeframe === item && styles.timeframeButtonActive]}>
                        <Text style={[styles.timeframeText, timeframe === item && styles.timeframeTextActive]}>{item === "M15" ? "15m" : "1h"}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <XauCandlestickChart candles={snapshot?.candles ?? []} trades={trades} />
                <View style={styles.chartMeta}>
                  <Text style={styles.muted}>Current {finite(state?.current_price) ? state?.current_price?.toFixed(2) : "—"}</Text>
                  <Text style={styles.muted}>H1 regime {state?.h1_regime ?? "—"}</Text>
                  <Text style={styles.muted}>
                    Candidate {state?.prediction_side ?? "NONE"} · confidence {finite(state?.prediction_confidence) ? `${(Number(state?.prediction_confidence) * 100).toFixed(1)}%` : "—"}
                  </Text>
                </View>
              </View>

              <View style={styles.sideColumn}>
                <View style={styles.panel}>
                  <Text style={styles.sectionEyebrow}>BOT STATE</Text>
                  <Text style={styles.panelTitle}>{state?.pending_route ?? "No pending setup"}</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>H1 regime</Text><Text style={styles.detailValue}>{state?.h1_regime ?? "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Next decision</Text><Text style={styles.detailValue}>{time(state?.next_decision_at)}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Policy</Text><Text style={styles.detailValue}>DROP SHORT ALIGNED</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Account</Text><Text style={styles.detailValue}>$500 · 0.01 lot</Text></View>
                </View>

                <View style={styles.panel}>
                  <View style={styles.rowBetween}>
                    <View><Text style={styles.sectionEyebrow}>OPEN POSITIONS</Text><Text style={styles.panelTitle}>{openTrades.length} active</Text></View>
                    <Text style={styles.openCap}>MAX 3</Text>
                  </View>
                  <View style={styles.positions}>
                    {openTrades.length ? openTrades.map((trade) => <PositionCard key={trade.trade_id} trade={trade} />) : <Text style={styles.muted}>No open trade. The bot is allowed to do nothing.</Text>}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.panelWide}>
              <View style={styles.sectionHeader}>
                <View><Text style={styles.sectionEyebrow}>ACCOUNT</Text><Text style={styles.sectionTitle}>Live shadow equity</Text></View>
                <View><Text style={styles.equityNow}>{plainMoney(state?.equity_usd)}</Text><Text style={styles.muted}>Balance {plainMoney(state?.balance_usd)}</Text></View>
              </View>
              <EquityCurve points={snapshot?.equity ?? []} />
            </View>

            <View style={styles.panelWide}>
              <View style={styles.sectionHeader}>
                <View><Text style={styles.sectionEyebrow}>VERIFIED LEDGER</Text><Text style={styles.sectionTitle}>Trade history</Text></View>
                <Text style={styles.muted}>Newest first · live shadow only</Text>
              </View>
              <View style={styles.tradeTable}>
                {closedTrades.length ? closedTrades.slice(0, 80).map((trade) => <TradeHistoryRow key={trade.trade_id} trade={trade} />) : <Text style={styles.muted}>No closed live-shadow trades yet.</Text>}
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Research / live-shadow system. Paper performance is not a promise of future returns. Historical July diagnostics were not a pristine untouched final shadow; this live feed begins the post-freeze forward test.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050505" },
  page: { width: "100%", maxWidth: 1480, alignSelf: "center", paddingHorizontal: 22, paddingTop: 20, paddingBottom: 60, gap: 18 },
  center: { flex: 1, minHeight: 500, alignItems: "center", justifyContent: "center", gap: 12 },
  centerBlock: { minHeight: 380, borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", alignItems: "center", justifyContent: "center", gap: 10 },
  hero: { borderWidth: 1, borderColor: "#1f2937", borderRadius: 28, backgroundColor: "#08090c", padding: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 20 },
  heroCopy: { flex: 1, minWidth: 280, maxWidth: 900 },
  heroTopline: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: "#34d399" },
  eyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { marginTop: 10, color: "#ffffff", fontSize: 36, fontWeight: "900", letterSpacing: -1.3 },
  subtitle: { marginTop: 10, color: "#a1a1aa", fontSize: 14, lineHeight: 22, maxWidth: 840 },
  heroStatus: { minWidth: 220, borderWidth: 1, borderColor: "#26303d", borderRadius: 18, padding: 16, backgroundColor: "#0b0d11" },
  heroStatusValue: { marginTop: 7, color: "#86efac", fontSize: 18, fontWeight: "900" },
  heroStatusMeta: { marginTop: 5, color: "#71717a", fontSize: 11 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexGrow: 1, flexBasis: 190, minWidth: 160, borderWidth: 1, borderColor: "#202026", borderRadius: 20, backgroundColor: "#09090b", padding: 16 },
  statLabel: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  statValue: { marginTop: 8, fontSize: 23, fontWeight: "900" },
  statNote: { marginTop: 5, color: "#71717a", fontSize: 11 },
  mainGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 16 },
  chartCard: { flexGrow: 3, flexBasis: 720, minWidth: 300, borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", padding: 16 },
  sideColumn: { flexGrow: 1, flexBasis: 330, minWidth: 290, gap: 16 },
  panel: { borderWidth: 1, borderColor: "#202026", borderRadius: 22, backgroundColor: "#09090b", padding: 17 },
  panelWide: { borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", padding: 18 },
  sectionHeader: { marginBottom: 15, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionEyebrow: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  sectionTitle: { marginTop: 5, color: "#f4f4f5", fontSize: 18, fontWeight: "900" },
  panelTitle: { marginTop: 5, marginBottom: 12, color: "#ffffff", fontSize: 17, fontWeight: "900" },
  timeframeWrap: { flexDirection: "row", borderWidth: 1, borderColor: "#27272a", borderRadius: 999, padding: 3, backgroundColor: "#050506" },
  timeframeButton: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  timeframeButtonActive: { backgroundColor: "#082f49" },
  timeframeText: { color: "#71717a", fontSize: 11, fontWeight: "900" },
  timeframeTextActive: { color: "#bae6fd" },
  chartMeta: { marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 18 },
  detailRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#17171b", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  detailLabel: { color: "#71717a", fontSize: 11, fontWeight: "700" },
  detailValue: { color: "#e4e4e7", fontSize: 11, fontWeight: "800", textAlign: "right" },
  positions: { gap: 10 },
  positionCard: { borderWidth: 1, borderColor: "#242730", borderRadius: 16, backgroundColor: "#07080b", padding: 13 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sideBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  buyBadge: { borderColor: "#155e75", backgroundColor: "#083344" },
  sellBadge: { borderColor: "#92400e", backgroundColor: "#451a03" },
  sideText: { fontSize: 10, fontWeight: "900" },
  routeText: { color: "#a1a1aa", fontSize: 9, fontWeight: "800" },
  positionPriceRow: { marginTop: 13, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  microLabel: { color: "#52525b", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  positionPrice: { marginTop: 3, color: "#f4f4f5", fontSize: 13, fontWeight: "900" },
  positionMeta: { marginTop: 11, color: "#52525b", fontSize: 9, lineHeight: 14 },
  openCap: { color: "#fde68a", fontSize: 10, fontWeight: "900" },
  equityChart: { borderWidth: 1, borderColor: "#1b1d24", borderRadius: 16, backgroundColor: "#07080b", padding: 10 },
  equityEmpty: { height: 150, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1b1d24", borderRadius: 16, backgroundColor: "#07080b" },
  equityFooter: { flexDirection: "row", justifyContent: "space-between" },
  equityNow: { color: "#67e8f9", fontSize: 20, fontWeight: "900", textAlign: "right" },
  tradeTable: { gap: 7 },
  tradeRow: { borderWidth: 1, borderColor: "#1e2027", borderRadius: 14, backgroundColor: "#07080b", padding: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 },
  tradeIdentity: { minWidth: 125, flexGrow: 1 },
  tradeSide: { fontSize: 12, fontWeight: "900" },
  tradeRoute: { marginTop: 3, color: "#71717a", fontSize: 9, fontWeight: "700" },
  tradeCell: { minWidth: 70 },
  tradeReason: { minWidth: 110, flexGrow: 1 },
  tradeValue: { marginTop: 3, color: "#e4e4e7", fontSize: 11, fontWeight: "800" },
  muted: { color: "#71717a", fontSize: 11, lineHeight: 17 },
  errorCard: { borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 18, backgroundColor: "#1c0a0d", padding: 16 },
  errorTitle: { color: "#fecdd3", fontSize: 13, fontWeight: "900" },
  errorText: { marginTop: 6, color: "#fda4af", fontSize: 11 },
  errorHint: { marginTop: 8, color: "#71717a", fontSize: 10 },
  lockCard: { marginTop: 40, minHeight: 420, borderWidth: 1, borderColor: "#243244", borderRadius: 30, backgroundColor: "#08090c", padding: 34, justifyContent: "center" },
  lockTitle: { marginTop: 12, color: "#ffffff", fontSize: 34, fontWeight: "900" },
  lockCopy: { marginTop: 14, maxWidth: 720, color: "#a1a1aa", fontSize: 15, lineHeight: 24 },
  disclaimer: { color: "#52525b", fontSize: 10, lineHeight: 17, textAlign: "center", paddingHorizontal: 20, paddingTop: 4 },
});
