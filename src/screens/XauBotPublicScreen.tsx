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

import { AppTopNav } from "../components/AppTopNav";
import { XauCandlestickChart } from "../components/XauCandlestickChart";
import {
  fetchXauBotSnapshot,
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

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

function TradeRow({ trade }: { trade: XauBotTrade }) {
  const long = trade.side === 1;
  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeLead}>
        <Text style={[styles.tradeSide, { color: long ? "#67e8f9" : "#fbbf24" }]}>
          {long ? "BUY" : "SELL"}
        </Text>
        <Text style={styles.tradeRoute}>{trade.route.replaceAll("_", " ")}</Text>
      </View>
      <Text style={styles.tradeValue}>{trade.entry_price.toFixed(2)}</Text>
      <Text style={styles.tradeValue}>{finite(trade.exit_price) ? trade.exit_price.toFixed(2) : "OPEN"}</Text>
      <Text style={styles.tradeValue}>{signed(trade.pips, 1)} pips</Text>
      <Text style={styles.tradeValue}>{money(trade.pnl_usd)}</Text>
    </View>
  );
}

export default function XauBotPublicScreen() {
  const [timeframe, setTimeframe] = useState<XauBotTimeframe>("M15");
  const [snapshot, setSnapshot] = useState<XauBotSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
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
    [timeframe]
  );

  useEffect(() => {
    void load(false);
    const id = setInterval(() => void load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <AppTopNav />

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <View style={styles.badgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrow}>FREE · XAUUSD · LIVE SHADOW · PAPER</Text>
            </View>
            <Text style={styles.title}>Structural Gold Bot</Text>
            <Text style={styles.subtitle}>
              Public forward test. Every paper trade, win and loss stays visible. The model proposes direction;
              price structure decides whether a trade exists.
            </Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.micro}>BOT STATUS</Text>
            <Text style={styles.statusValue}>{state?.status ?? "INITIALIZING"}</Text>
            <Text style={styles.statusMeta}>
              Updated {time(state?.updated_at)}{refreshing ? " · refreshing" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.publicNote}>
          <Text style={styles.publicNoteTitle}>Public by design</Text>
          <Text style={styles.publicNoteText}>
            No login or subscription is required to watch the shadow account. This is paper performance,
            not a promise of future returns and not financial advice.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Live feed unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !snapshot ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.muted}>Loading public XAU shadow feed…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <Stat label="EQUITY" value={plainMoney(state?.equity_usd)} note={`Started ${plainMoney(state?.starting_balance_usd ?? 500)}`} />
              <Stat label="NET P/L" value={money(state?.realized_pnl_usd)} note={`${state?.total_trades ?? 0} closed trades`} />
              <Stat label="WIN RATE" value={pct(state?.win_rate)} note={`${state?.wins ?? 0} wins · ${state?.losses ?? 0} losses`} />
              <Stat label="OPEN" value={`${state?.open_positions ?? openTrades.length}/${state?.max_open_positions ?? 3}`} note="portfolio cap" />
              <Stat label="MAX DD" value={money(state?.max_drawdown_usd)} note={pct(state?.max_drawdown_pct)} />
              <Stat label="TOTAL PIPS" value={signed(state?.total_pips, 1)} note={`PF ${finite(state?.profit_factor) ? state?.profit_factor?.toFixed(2) : "—"}`} />
            </View>

            <View style={styles.mainGrid}>
              <View style={styles.chartCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.micro}>PRICE ACTION</Text>
                    <Text style={styles.sectionTitle}>XAUUSD execution chart</Text>
                  </View>
                  <View style={styles.tfWrap}>
                    {(["M15", "H1"] as XauBotTimeframe[]).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setTimeframe(item)}
                        style={[styles.tfButton, timeframe === item && styles.tfButtonActive]}
                      >
                        <Text style={[styles.tfText, timeframe === item && styles.tfTextActive]}>
                          {item === "M15" ? "15m" : "1h"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <XauCandlestickChart candles={snapshot?.candles ?? []} trades={trades} />

                <View style={styles.metaRow}>
                  <Text style={styles.muted}>Price {finite(state?.current_price) ? state?.current_price?.toFixed(2) : "—"}</Text>
                  <Text style={styles.muted}>H1 {state?.h1_regime ?? "—"}</Text>
                  <Text style={styles.muted}>Prediction {state?.prediction_side ?? "NONE"}</Text>
                  <Text style={styles.muted}>Pending {state?.pending_route ?? "NONE"}</Text>
                </View>
              </View>

              <View style={styles.sideColumn}>
                <View style={styles.panel}>
                  <Text style={styles.micro}>LIVE STATE</Text>
                  <Text style={styles.panelTitle}>{state?.pending_route ?? "No pending setup"}</Text>
                  <View style={styles.detail}><Text style={styles.detailLabel}>Regime</Text><Text style={styles.detailValue}>{state?.h1_regime ?? "—"}</Text></View>
                  <View style={styles.detail}><Text style={styles.detailLabel}>Prediction</Text><Text style={styles.detailValue}>{state?.prediction_side ?? "—"}</Text></View>
                  <View style={styles.detail}><Text style={styles.detailLabel}>Next decision</Text><Text style={styles.detailValue}>{time(state?.next_decision_at)}</Text></View>
                  <View style={styles.detail}><Text style={styles.detailLabel}>Account</Text><Text style={styles.detailValue}>$500 · 0.01 lot</Text></View>
                  <View style={styles.detail}><Text style={styles.detailLabel}>Policy</Text><Text style={styles.detailValue}>MAX 3 · PAPER ONLY</Text></View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.micro}>OPEN POSITIONS</Text>
                  <Text style={styles.panelTitle}>{openTrades.length} active</Text>
                  {openTrades.length ? (
                    openTrades.map((trade) => (
                      <View key={trade.trade_id} style={styles.openTrade}>
                        <Text style={styles.openTradeSide}>{trade.side === 1 ? "BUY" : "SELL"} · {trade.route.replaceAll("_", " ")}</Text>
                        <Text style={styles.muted}>Entry {trade.entry_price.toFixed(2)} · SL {trade.sl_price.toFixed(2)} · TP {trade.tp_price.toFixed(2)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.muted}>No open trade. Doing nothing is allowed.</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.panelWide}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.micro}>VERIFIED LEDGER</Text>
                  <Text style={styles.sectionTitle}>Trade history</Text>
                </View>
                <Text style={styles.muted}>Newest first · losses are not hidden</Text>
              </View>
              <View style={styles.tradeTable}>
                {closedTrades.length ? (
                  closedTrades.slice(0, 80).map((trade) => <TradeRow key={trade.trade_id} trade={trade} />)
                ) : (
                  <Text style={styles.muted}>No closed live-shadow trades yet.</Text>
                )}
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Forward live-shadow test. Paper results can differ materially from real execution because of spreads,
              slippage, liquidity and broker conditions. Historical research results are not a guarantee of future performance.
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
  hero: { borderWidth: 1, borderColor: "#1f2937", borderRadius: 28, backgroundColor: "#08090c", padding: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 20 },
  heroCopy: { flex: 1, minWidth: 280, maxWidth: 900 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: "#34d399" },
  eyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { marginTop: 10, color: "#ffffff", fontSize: 36, fontWeight: "900", letterSpacing: -1.2 },
  subtitle: { marginTop: 10, color: "#a1a1aa", fontSize: 14, lineHeight: 22, maxWidth: 850 },
  statusCard: { minWidth: 220, borderWidth: 1, borderColor: "#26303d", borderRadius: 18, padding: 16, backgroundColor: "#0b0d11" },
  micro: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  statusValue: { marginTop: 7, color: "#86efac", fontSize: 18, fontWeight: "900" },
  statusMeta: { marginTop: 5, color: "#71717a", fontSize: 11 },
  publicNote: { borderWidth: 1, borderColor: "#164e63", borderRadius: 18, backgroundColor: "#06252d", padding: 16 },
  publicNoteTitle: { color: "#a5f3fc", fontSize: 13, fontWeight: "900" },
  publicNoteText: { marginTop: 6, color: "#94a3b8", fontSize: 12, lineHeight: 19 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexGrow: 1, flexBasis: 190, minWidth: 160, borderWidth: 1, borderColor: "#202026", borderRadius: 20, backgroundColor: "#09090b", padding: 16 },
  statLabel: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  statValue: { marginTop: 8, color: "#ffffff", fontSize: 23, fontWeight: "900" },
  statNote: { marginTop: 5, color: "#71717a", fontSize: 11 },
  mainGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 16 },
  chartCard: { flexGrow: 3, flexBasis: 720, minWidth: 300, borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", padding: 16 },
  sideColumn: { flexGrow: 1, flexBasis: 330, minWidth: 290, gap: 16 },
  panel: { borderWidth: 1, borderColor: "#202026", borderRadius: 22, backgroundColor: "#09090b", padding: 17 },
  panelWide: { borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", padding: 18 },
  panelTitle: { marginTop: 5, marginBottom: 12, color: "#ffffff", fontSize: 17, fontWeight: "900" },
  sectionHeader: { marginBottom: 15, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { marginTop: 5, color: "#f4f4f5", fontSize: 18, fontWeight: "900" },
  tfWrap: { flexDirection: "row", borderWidth: 1, borderColor: "#27272a", borderRadius: 999, padding: 3, backgroundColor: "#050506" },
  tfButton: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  tfButtonActive: { backgroundColor: "#082f49" },
  tfText: { color: "#71717a", fontSize: 11, fontWeight: "900" },
  tfTextActive: { color: "#bae6fd" },
  metaRow: { marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 18 },
  detail: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#17171b", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  detailLabel: { color: "#71717a", fontSize: 11, fontWeight: "700" },
  detailValue: { color: "#e4e4e7", fontSize: 11, fontWeight: "800", textAlign: "right" },
  openTrade: { marginTop: 8, borderWidth: 1, borderColor: "#242730", borderRadius: 14, backgroundColor: "#07080b", padding: 12 },
  openTradeSide: { color: "#f4f4f5", fontSize: 11, fontWeight: "900", marginBottom: 5 },
  tradeTable: { gap: 7 },
  tradeRow: { borderWidth: 1, borderColor: "#1e2027", borderRadius: 14, backgroundColor: "#07080b", padding: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 },
  tradeLead: { minWidth: 140, flexGrow: 1 },
  tradeSide: { fontSize: 12, fontWeight: "900" },
  tradeRoute: { marginTop: 3, color: "#71717a", fontSize: 9, fontWeight: "700" },
  tradeValue: { minWidth: 80, color: "#e4e4e7", fontSize: 11, fontWeight: "800" },
  loadingCard: { minHeight: 360, borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", alignItems: "center", justifyContent: "center", gap: 10 },
  errorCard: { borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 18, backgroundColor: "#1c0a0d", padding: 16 },
  errorTitle: { color: "#fecdd3", fontSize: 13, fontWeight: "900" },
  errorText: { marginTop: 6, color: "#fda4af", fontSize: 11 },
  muted: { color: "#71717a", fontSize: 11, lineHeight: 17 },
  disclaimer: { color: "#52525b", fontSize: 10, lineHeight: 17, textAlign: "center", paddingHorizontal: 20, paddingTop: 4 },
});
