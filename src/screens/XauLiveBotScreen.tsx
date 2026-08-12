import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";

import { AppTopNav } from "../components/AppTopNav";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchXauBotCandles,
  fetchXauBotMetrics,
  fetchXauBotState,
  fetchXauBotTrades,
  type XauBotCandle,
  type XauBotMetrics,
  type XauBotStatePayload,
  type XauBotTimeframe,
  type XauBotTrade,
} from "../services/xauLiveBotApi";

function fmt(value?: number | null, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

function pct(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : "—";
}

function shortTime(value?: string | null) {
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

function sideLabel(side?: number | null) {
  if (side === 1) return "BUY";
  if (side === -1) return "SELL";
  return "—";
}

function statusTone(status?: string | null) {
  const s = String(status ?? "").toUpperCase();
  if (s === "OPEN" || s.includes("CONFIRMED")) return styles.goodText;
  if (s.includes("WAITING") || s === "ARMED") return styles.warnText;
  if (s.includes("ERROR") || s.includes("EXPIRED")) return styles.badText;
  return styles.mutedText;
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {note ? <Text style={styles.metricNote}>{note}</Text> : null}
    </View>
  );
}

function PipelineStep({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <View style={[styles.pipelineStep, active && styles.pipelineStepActive]}>
      <Text style={styles.pipelineLabel}>{label}</Text>
      <Text style={[styles.pipelineValue, active && styles.pipelineValueActive]}>{value}</Text>
    </View>
  );
}

function CandleChart({
  candles,
  trades,
  activeTrade,
  width,
}: {
  candles: XauBotCandle[];
  trades: XauBotTrade[];
  activeTrade?: Record<string, any> | null;
  width: number;
}) {
  const height = 410;
  const left = 55;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const plotW = Math.max(240, width - left - right);
  const plotH = height - top - bottom;

  const model = useMemo(() => {
    if (!candles.length) return null;

    const minT = new Date(candles[0].time_utc).getTime();
    const maxT = new Date(candles[candles.length - 1].time_utc).getTime();
    const extraPrices: number[] = [];

    if (activeTrade) {
      [activeTrade.entry_price, activeTrade.sl_price, activeTrade.tp_price].forEach((v) => {
        if (typeof v === "number" && Number.isFinite(v)) extraPrices.push(v);
      });
    }

    for (const trade of trades) {
      const opened = new Date(trade.opened_at).getTime();
      const closed = trade.closed_at ? new Date(trade.closed_at).getTime() : maxT;
      if (closed < minT || opened > maxT) continue;
      [trade.entry_price, trade.sl_price, trade.tp_price, trade.exit_price].forEach((v) => {
        if (typeof v === "number" && Number.isFinite(v)) extraPrices.push(v);
      });
    }

    let minP = Math.min(...candles.map((c) => c.low), ...extraPrices);
    let maxP = Math.max(...candles.map((c) => c.high), ...extraPrices);
    const pad = Math.max((maxP - minP) * 0.06, 0.5);
    minP -= pad;
    maxP += pad;

    const x = (time: string) => {
      const t = new Date(time).getTime();
      if (maxT === minT) return left + plotW / 2;
      return left + ((t - minT) / (maxT - minT)) * plotW;
    };
    const y = (price: number) => top + ((maxP - price) / (maxP - minP)) * plotH;

    return { minT, maxT, minP, maxP, x, y };
  }, [activeTrade, candles, left, plotH, plotW, top, trades]);

  if (!model || !candles.length) {
    return (
      <View style={[styles.chartEmpty, { width, height }]}>
        <Text style={styles.mutedText}>Waiting for XAU candles…</Text>
      </View>
    );
  }

  const candleW = Math.max(2, Math.min(8, plotW / Math.max(candles.length, 1) * 0.58));
  const ticks = 5;

  return (
    <View style={styles.chartShell}>
      <Svg width={width} height={height}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const price = model.maxP - ((model.maxP - model.minP) * i) / ticks;
          const yy = model.y(price);
          return (
            <G key={`grid-${i}`}>
              <Line x1={left} x2={left + plotW} y1={yy} y2={yy} stroke="#22252b" strokeWidth={1} />
              <SvgText x={4} y={yy + 4} fill="#71717a" fontSize={10}>
                {price.toFixed(1)}
              </SvgText>
            </G>
          );
        })}

        {candles.map((c) => {
          const xx = model.x(c.time_utc);
          const up = c.close >= c.open;
          const bodyTop = model.y(Math.max(c.open, c.close));
          const bodyBottom = model.y(Math.min(c.open, c.close));
          const bodyH = Math.max(1.5, bodyBottom - bodyTop);
          const color = up ? "#34d399" : "#fb7185";
          return (
            <G key={c.time_utc}>
              <Line x1={xx} x2={xx} y1={model.y(c.high)} y2={model.y(c.low)} stroke={color} strokeWidth={1} />
              <Rect x={xx - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={1} />
            </G>
          );
        })}

        {trades.map((trade) => {
          const opened = new Date(trade.opened_at).getTime();
          const closed = trade.closed_at ? new Date(trade.closed_at).getTime() : model.maxT;
          if (closed < model.minT || opened > model.maxT) return null;
          const x1 = Math.max(left, model.x(trade.opened_at));
          const x2 = trade.closed_at ? Math.min(left + plotW, model.x(trade.closed_at)) : left + plotW;
          const sideColor = trade.side === 1 ? "#38bdf8" : "#f59e0b";
          return (
            <G key={`trade-${trade.trade_id}`}>
              <Line x1={x1} x2={x2} y1={model.y(trade.entry_price)} y2={model.y(trade.entry_price)} stroke={sideColor} strokeWidth={1.5} strokeDasharray="5 4" />
              <Line x1={x1} x2={x2} y1={model.y(trade.sl_price)} y2={model.y(trade.sl_price)} stroke="#fb7185" strokeWidth={1} strokeDasharray="3 4" />
              <Line x1={x1} x2={x2} y1={model.y(trade.tp_price)} y2={model.y(trade.tp_price)} stroke="#34d399" strokeWidth={1} strokeDasharray="3 4" />
              <Circle cx={x1} cy={model.y(trade.entry_price)} r={4} fill={sideColor} />
              {trade.closed_at && typeof trade.exit_price === "number" ? (
                <Circle
                  cx={x2}
                  cy={model.y(trade.exit_price)}
                  r={4}
                  fill={(trade.net_r ?? trade.gross_r ?? 0) >= 0 ? "#34d399" : "#fb7185"}
                />
              ) : null}
            </G>
          );
        })}

        {activeTrade ? (
          <G>
            <Line x1={left} x2={left + plotW} y1={model.y(Number(activeTrade.entry_price))} y2={model.y(Number(activeTrade.entry_price))} stroke="#38bdf8" strokeWidth={2} />
            <Line x1={left} x2={left + plotW} y1={model.y(Number(activeTrade.sl_price))} y2={model.y(Number(activeTrade.sl_price))} stroke="#fb7185" strokeWidth={1.5} strokeDasharray="6 4" />
            <Line x1={left} x2={left + plotW} y1={model.y(Number(activeTrade.tp_price))} y2={model.y(Number(activeTrade.tp_price))} stroke="#34d399" strokeWidth={1.5} strokeDasharray="6 4" />
            <SvgText x={left + 6} y={model.y(Number(activeTrade.entry_price)) - 5} fill="#7dd3fc" fontSize={10}>ENTRY</SvgText>
            <SvgText x={left + 6} y={model.y(Number(activeTrade.sl_price)) - 5} fill="#fda4af" fontSize={10}>SL</SvgText>
            <SvgText x={left + 6} y={model.y(Number(activeTrade.tp_price)) - 5} fill="#6ee7b7" fontSize={10}>TP 1.5R</SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

export default function XauLiveBotScreen() {
  const { isAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const [timeframe, setTimeframe] = useState<XauBotTimeframe>("M15");
  const [state, setState] = useState<XauBotStatePayload | null>(null);
  const [metrics, setMetrics] = useState<XauBotMetrics | null>(null);
  const [trades, setTrades] = useState<XauBotTrade[]>([]);
  const [candles, setCandles] = useState<XauBotCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setError(null);
      const [nextState, nextMetrics, nextTrades, nextCandles] = await Promise.all([
        fetchXauBotState(),
        fetchXauBotMetrics(),
        fetchXauBotTrades(120),
        fetchXauBotCandles(timeframe, timeframe === "M15" ? 120 : 96),
      ]);
      setState(nextState);
      setMetrics(nextMetrics ?? nextState?.metrics ?? null);
      setTrades(nextTrades);
      setCandles(nextCandles);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, timeframe]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <AppTopNav />
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>RESEARCH ACCESS</Text>
            <Text style={styles.title}>XAU Live Bot</Text>
            <Text style={styles.body}>This live-shadow module is private while validation continues.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const active = state?.active_trade ?? null;
  const opp = state?.opportunity ?? null;
  const f1 = state?.f1 ?? null;
  const ca = state?.cross_asset ?? null;
  const chartWidth = Math.max(310, Math.min(1180, width - 52));
  const currentStatus = state?.status ?? (loading ? "LOADING" : "NO DATA");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#38bdf8" />}
      >
        <AppTopNav />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flexOne}>
              <Text style={styles.eyebrow}>LIVE SHADOW · XAUUSD</Text>
              <Text style={styles.title}>Opportunity → F1 → JPY + ZN → 1.5R</Text>
              <Text style={styles.body}>
                Real market data, virtual execution, zero broker orders. This is a live research ledger, not a promoted signal service.
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusBadgeText, statusTone(currentStatus)]}>{currentStatus}</Text>
              <Text style={styles.statusSub}>{shortTime(state?.generated_at_utc)}</Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.pipeline}>
          <PipelineStep
            label="ML Opportunity"
            value={opp?.ready === false ? "Bundle waiting" : opp?.high_opportunity ? `TOP15 · ${fmt(opp.opp_score, 3)}` : "No active opportunity"}
            active={Boolean(opp?.high_opportunity)}
          />
          <PipelineStep label="XAU F1" value={f1?.side ? `${sideLabel(f1.side)} · ${shortTime(f1.confirm_close_time_utc)}` : "Waiting"} active={Boolean(f1?.side)} />
          <PipelineStep label="JPY + ZN" value={ca?.confirmed ? `${ca.label ?? "Confirmed"} · ${shortTime(ca.confirm_close_time_utc)}` : "Waiting"} active={Boolean(ca?.confirmed)} />
          <PipelineStep label="Position" value={active ? `${active.direction} @ ${fmt(active.entry_price)}` : "Flat"} active={Boolean(active)} />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Closed trades" value={String(metrics?.closed_trades ?? 0)} />
          <MetricCard label="Win rate" value={pct(metrics?.win_rate)} note={`${metrics?.wins ?? 0}W / ${metrics?.losses ?? 0}L`} />
          <MetricCard label="Net R" value={fmt(metrics?.net_r, 2)} />
          <MetricCard label="Profit factor" value={fmt(metrics?.profit_factor, 2)} />
          <MetricCard label="Total pips" value={fmt(metrics?.total_pips, 1)} />
          <MetricCard label="Max DD" value={`${fmt(metrics?.max_drawdown_r, 2)}R`} />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>CURRENT TRADE</Text>
              <Text style={styles.sectionTitle}>{active ? `${active.direction} XAUUSD` : "No open trade"}</Text>
            </View>
            {active ? (
              <View style={styles.pnlBadge}>
                <Text style={styles.pnlText}>{fmt(active.unrealized_r, 2)}R · {fmt(active.unrealized_pips, 1)} pips</Text>
              </View>
            ) : null}
          </View>

          {active ? (
            <View style={styles.tradeLevelGrid}>
              <MetricCard label="Entry" value={fmt(active.entry_price)} note={shortTime(active.opened_at_utc)} />
              <MetricCard label="Stop" value={fmt(active.sl_price)} note={`${fmt(active.risk_price)} price risk`} />
              <MetricCard label="TP" value={fmt(active.tp_price)} note="Full exit · +1.5R" />
              <MetricCard label="Current" value={fmt(state?.current_price)} note={`${fmt(active.unrealized_pips, 1)} pips`} />
            </View>
          ) : (
            <Text style={styles.body}>Bot is flat. The screen remains live and will show the full trade box as soon as the frozen pipeline produces a valid entry.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>XAUUSD CHART</Text>
              <Text style={styles.sectionTitle}>{timeframe} · trade levels + history</Text>
            </View>
            <View style={styles.toggleWrap}>
              {(["M15", "H1"] as XauBotTimeframe[]).map((tf) => (
                <Pressable key={tf} onPress={() => setTimeframe(tf)} style={[styles.toggle, timeframe === tf && styles.toggleActive]}>
                  <Text style={[styles.toggleText, timeframe === tf && styles.toggleTextActive]}>{tf}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <CandleChart candles={candles} trades={trades} activeTrade={active} width={chartWidth} />
          </ScrollView>
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>● blue/orange = entry</Text>
            <Text style={styles.legendText}>● green/red = historical exit</Text>
            <Text style={styles.legendText}>dashed = entry / SL / TP path</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionKicker}>TRADE HISTORY</Text>
          <Text style={styles.sectionTitle}>Recent XAU shadow executions</Text>
          <View style={styles.historyHead}>
            <Text style={[styles.historyCell, styles.historyWide]}>Trade</Text>
            <Text style={styles.historyCell}>R</Text>
            <Text style={styles.historyCell}>Pips</Text>
            <Text style={styles.historyCell}>Exit</Text>
          </View>
          {trades.length ? trades.slice(0, 30).map((trade) => {
            const result = trade.net_r ?? trade.gross_r;
            return (
              <View key={trade.trade_id} style={styles.historyRow}>
                <View style={styles.historyWide}>
                  <Text style={[styles.historyTrade, trade.side === 1 ? styles.buyText : styles.sellText]}>{trade.direction} · {fmt(trade.entry_price)}</Text>
                  <Text style={styles.historyMeta}>{shortTime(trade.opened_at)}{trade.closed_at ? ` → ${shortTime(trade.closed_at)}` : " · OPEN"}</Text>
                </View>
                <Text style={[styles.historyCell, (result ?? 0) >= 0 ? styles.goodText : styles.badText]}>{fmt(result, 2)}</Text>
                <Text style={[styles.historyCell, (trade.net_pips ?? trade.gross_pips ?? 0) >= 0 ? styles.goodText : styles.badText]}>{fmt(trade.net_pips ?? trade.gross_pips, 1)}</Text>
                <Text style={[styles.historyCell, styles.mutedText]}>{trade.exit_reason ?? trade.status}</Text>
              </View>
            );
          }) : <Text style={styles.body}>No completed XAU shadow trades yet.</Text>}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>Research mode</Text>
          <Text style={styles.footerText}>
            No live-money order is sent from this screen or the shadow engine. R and pips are tracked from market data. Dollar P/L stays disabled until an explicit virtual sizing model is configured.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#030305" },
  container: { width: "100%", maxWidth: 1280, alignSelf: "center", padding: 20, paddingBottom: 60 },
  flexOne: { flex: 1 },
  hero: { borderWidth: 1, borderColor: "#202026", backgroundColor: "#09090b", borderRadius: 26, padding: 22, marginBottom: 16 },
  heroTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 18 },
  eyebrow: { color: "#38bdf8", fontSize: 11, fontWeight: "900", letterSpacing: 2.1 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 7 },
  body: { color: "#a1a1aa", fontSize: 13, lineHeight: 21, marginTop: 9, maxWidth: 820 },
  statusBadge: { minWidth: 170, borderWidth: 1, borderColor: "#27272a", borderRadius: 18, backgroundColor: "#111113", paddingHorizontal: 15, paddingVertical: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: "900" },
  statusSub: { color: "#71717a", fontSize: 10, marginTop: 5 },
  error: { color: "#fda4af", marginTop: 12, fontSize: 12 },
  pipeline: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  pipelineStep: { flexGrow: 1, flexBasis: 210, borderWidth: 1, borderColor: "#202026", borderRadius: 18, backgroundColor: "#09090b", padding: 15 },
  pipelineStepActive: { borderColor: "#0c4a6e", backgroundColor: "#071820" },
  pipelineLabel: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  pipelineValue: { color: "#d4d4d8", fontSize: 13, fontWeight: "800", marginTop: 6 },
  pipelineValueActive: { color: "#7dd3fc" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  metricCard: { flexGrow: 1, flexBasis: 145, minWidth: 135, borderWidth: 1, borderColor: "#202026", borderRadius: 17, backgroundColor: "#0b0b0e", padding: 14 },
  metricLabel: { color: "#71717a", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 },
  metricValue: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 7 },
  metricNote: { color: "#71717a", fontSize: 10, marginTop: 5 },
  sectionCard: { borderWidth: 1, borderColor: "#202026", borderRadius: 24, backgroundColor: "#09090b", padding: 18, marginBottom: 16, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  sectionKicker: { color: "#71717a", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  sectionTitle: { color: "#fff", fontSize: 19, fontWeight: "900", marginTop: 4 },
  pnlBadge: { borderRadius: 999, backgroundColor: "#052e2b", borderWidth: 1, borderColor: "#065f46", paddingHorizontal: 13, paddingVertical: 8 },
  pnlText: { color: "#6ee7b7", fontSize: 12, fontWeight: "900" },
  tradeLevelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toggleWrap: { flexDirection: "row", gap: 6, borderWidth: 1, borderColor: "#27272a", borderRadius: 999, padding: 4 },
  toggle: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  toggleActive: { backgroundColor: "#082f49" },
  toggleText: { color: "#71717a", fontSize: 11, fontWeight: "900" },
  toggleTextActive: { color: "#7dd3fc" },
  chartShell: { borderWidth: 1, borderColor: "#18181b", borderRadius: 18, backgroundColor: "#050507", overflow: "hidden" },
  chartEmpty: { borderWidth: 1, borderColor: "#18181b", borderRadius: 18, backgroundColor: "#050507", alignItems: "center", justifyContent: "center" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  legendText: { color: "#71717a", fontSize: 10 },
  historyHead: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#202026", paddingVertical: 10, marginTop: 10 },
  historyRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#151518", paddingVertical: 12 },
  historyWide: { flex: 2.4, minWidth: 170 },
  historyCell: { flex: 1, color: "#d4d4d8", fontSize: 11, paddingRight: 8 },
  historyTrade: { fontSize: 12, fontWeight: "900" },
  historyMeta: { color: "#71717a", fontSize: 9, marginTop: 4 },
  footerNote: { borderWidth: 1, borderColor: "#3f3f46", borderRadius: 18, padding: 16, backgroundColor: "#0c0c0f" },
  footerTitle: { color: "#d4d4d8", fontSize: 12, fontWeight: "900" },
  footerText: { color: "#71717a", fontSize: 11, lineHeight: 18, marginTop: 6 },
  goodText: { color: "#34d399" },
  badText: { color: "#fb7185" },
  warnText: { color: "#fbbf24" },
  mutedText: { color: "#71717a" },
  buyText: { color: "#38bdf8" },
  sellText: { color: "#f59e0b" },
});
