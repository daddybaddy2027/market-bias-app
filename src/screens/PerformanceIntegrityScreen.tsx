import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppTopNav } from "../components/AppTopNav";
import {
  MODEL_CATALOG,
  type ModelDefinition,
} from "../config/modelCatalog";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchExactModelHistory,
  type ExtendedHistoryRow,
} from "../services/modelHistory";

type LoadedModelHistory = {
  model: ModelDefinition;
  rows: ExtendedHistoryRow[];
  error?: string;
};

type Outcome = "correct" | "incorrect" | "pending" | "evaluated";
type StatusFilter = "all" | Outcome;

type Score = {
  correct: number;
  incorrect: number;
  pending: number;
  evaluated: number;
  accuracy: number | null;
  forecastPips: number;
};

const RELEASE_ACCURACY = 0.55;
const MIN_INDEPENDENT_SAMPLE = 8;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function outcome(row: ExtendedHistoryRow): Outcome {
  if (String(row.evaluationStatus).toLowerCase() !== "evaluated") return "pending";
  if (row.directionHit === true) return "correct";
  if (row.directionHit === false) return "incorrect";
  return "evaluated";
}

function biasSign(value: string) {
  const text = String(value).toLowerCase();
  if (text.includes("bull") || text.includes("buy") || text.includes("long")) return 1;
  if (text.includes("bear") || text.includes("sell") || text.includes("short")) return -1;
  return 0;
}

function normalizedForecastPips(row: ExtendedHistoryRow) {
  const start = row.startPrice;
  const close = row.actualClose;
  const direction = biasSign(row.bias);

  if (finite(start) && finite(close) && direction !== 0) {
    const pipSize = row.asset.toUpperCase().endsWith("JPY") ? 0.01 : 0.0001;
    return direction * (close - start) / pipSize;
  }

  if (!finite(row.netPips)) return null;

  // Historical JPY rows were once stored with the 0.0001 non-JPY scale.
  // The price-based calculation above is preferred. This fallback only
  // prevents an old malformed row from recreating a +50,000 pip scorecard.
  if (row.asset.toUpperCase().endsWith("JPY") && Math.abs(row.netPips) > 2000) {
    return row.netPips / 100;
  }

  return row.netPips;
}

function rowKey(row: ExtendedHistoryRow) {
  return `${row.modelKey}|${row.predictionTimeUtc}`;
}

function selectIndependentRows(rows: ExtendedHistoryRow[], horizonH: number) {
  const explicit = rows.filter((row) => row.isNonOverlapping);
  if (explicit.length) return explicit;

  const ordered = [...rows].sort((left, right) =>
    left.predictionTimeUtc.localeCompare(right.predictionTimeUtc)
  );
  const selected: ExtendedHistoryRow[] = [];
  let nextAllowed = Number.NEGATIVE_INFINITY;

  for (const row of ordered) {
    const timestamp = new Date(row.predictionTimeUtc).getTime();
    if (!Number.isFinite(timestamp) || timestamp < nextAllowed) continue;
    selected.push(row);
    nextAllowed = timestamp + horizonH * 60 * 60 * 1000;
  }

  return selected;
}

function score(rows: ExtendedHistoryRow[]): Score {
  const correct = rows.filter((row) => outcome(row) === "correct").length;
  const incorrect = rows.filter((row) => outcome(row) === "incorrect").length;
  const pending = rows.filter((row) => outcome(row) === "pending").length;
  const evaluated = correct + incorrect;
  const forecastPips = rows.reduce(
    (sum, row) => sum + (normalizedForecastPips(row) ?? 0),
    0
  );

  return {
    correct,
    incorrect,
    pending,
    evaluated,
    accuracy: evaluated ? correct / evaluated : null,
    forecastPips,
  };
}

function percent(value: number | null) {
  return value === null ? "Collecting" : `${(value * 100).toFixed(1)}%`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Metric({ label, value, tone = "default" }: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "pending";
}) {
  const color = tone === "good"
    ? "#6ee7b7"
    : tone === "bad"
      ? "#fda4af"
      : tone === "pending"
        ? "#fde68a"
        : "#ffffff";

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function ScorePanel({ title, subtitle, value }: {
  title: string;
  subtitle: string;
  value: Score;
}) {
  return (
    <View style={styles.scorePanel}>
      <Text style={styles.scoreTitle}>{title}</Text>
      <Text style={styles.scoreSubtitle}>{subtitle}</Text>
      <View style={styles.metricsRow}>
        <Metric label="Accuracy" value={percent(value.accuracy)} />
        <Metric label="Correct" value={String(value.correct)} tone="good" />
        <Metric label="Incorrect" value={String(value.incorrect)} tone="bad" />
        <Metric label="Pending" value={String(value.pending)} tone="pending" />
        <Metric
          label="Forecast pips"
          value={signed(value.forecastPips)}
          tone={value.forecastPips >= 0 ? "good" : "bad"}
        />
      </View>
    </View>
  );
}

function ModelScorecard({ item }: { item: LoadedModelHistory }) {
  const independentRows = selectIndependentRows(item.rows, item.model.horizonH);
  const allScore = score(item.rows);
  const independentScore = score(independentRows);
  const enoughSample = independentScore.evaluated >= MIN_INDEPENDENT_SAMPLE;
  const clearsThreshold =
    enoughSample &&
    independentScore.accuracy !== null &&
    independentScore.accuracy >= RELEASE_ACCURACY;
  const failsThreshold =
    enoughSample &&
    independentScore.accuracy !== null &&
    independentScore.accuracy < RELEASE_ACCURACY;

  const statusText = failsThreshold
    ? "BELOW RELEASE THRESHOLD"
    : clearsThreshold
      ? "PRODUCTION VERIFIED"
      : "INDEPENDENT SAMPLE BUILDING";
  const statusColor = failsThreshold
    ? "#fda4af"
    : clearsThreshold
      ? "#6ee7b7"
      : "#fde68a";

  return (
    <View style={styles.modelCard}>
      <View style={styles.modelHeader}>
        <View style={styles.modelCopy}>
          <Text style={styles.modelName}>{item.model.displayName}</Text>
          <Text style={styles.modelMeta}>
            {item.model.asset} · {item.model.horizonH}h · Pro
          </Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}> 
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.dualGrid}>
        <ScorePanel
          title="All published predictions"
          subtitle="Every stored production timestamp, including overlapping horizons."
          value={allScore}
        />
        <ScorePanel
          title="Independent episodes"
          subtitle={`Non-overlapping ${item.model.horizonH}h samples used for release decisions. Minimum n=${MIN_INDEPENDENT_SAMPLE}.`}
          value={independentScore}
        />
      </View>

      {item.error ? <Text style={styles.errorText}>{item.error}</Text> : null}
    </View>
  );
}

function FilterButton({ active, label, onPress }: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function PerformanceIntegrityScreen() {
  const { hasModelsAccess } = useAuth();
  const [loaded, setLoaded] = useState<LoadedModelHistory[]>([]);
  const [loading, setLoading] = useState(hasModelsAccess);
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!hasModelsAccess) {
        setLoaded([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const results = await Promise.all(
        MODEL_CATALOG.map(async (model) => {
          try {
            const rows = await fetchExactModelHistory(model, 500);
            return { model, rows } satisfies LoadedModelHistory;
          } catch (error) {
            return {
              model,
              rows: [],
              error: error instanceof Error ? error.message : String(error),
            } satisfies LoadedModelHistory;
          }
        })
      );

      if (active) {
        setLoaded(results);
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hasModelsAccess]);

  const aggregate = useMemo(() => {
    const allRows = loaded.flatMap((item) => item.rows);
    const independentRows = loaded.flatMap((item) =>
      selectIndependentRows(item.rows, item.model.horizonH)
    );
    return {
      all: score(allRows),
      independent: score(independentRows),
    };
  }, [loaded]);

  const independentKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of loaded) {
      for (const row of selectIndependentRows(item.rows, item.model.horizonH)) {
        keys.add(rowKey(row));
      }
    }
    return keys;
  }, [loaded]);

  const ledger = useMemo(() => {
    return loaded
      .flatMap((item) => item.rows.map((row) => ({ model: item.model, row })))
      .filter(({ model }) => modelFilter === "all" || model.modelKey === modelFilter)
      .filter(({ row }) => statusFilter === "all" || outcome(row) === statusFilter)
      .sort((left, right) => right.row.predictionTimeUtc.localeCompare(left.row.predictionTimeUtc))
      .slice(0, 150);
  }, [loaded, modelFilter, statusFilter]);

  return (
    <SafeAreaView
      style={[
        styles.page,
        Platform.OS === "web" ? ({ height: "100vh" } as any) : null,
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopNav />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PERFORMANCE INTEGRITY V2</Text>
          <Text style={styles.heroTitle}>Overlapping forecasts and independent ideas are not the same statistic.</Text>
          <Text style={styles.heroBody}>
            Every published prediction remains in the ledger. Release decisions use the smaller
            non-overlapping sample, while signed forecast pips are recalculated from entry and
            terminal prices with the correct instrument pip size.
          </Text>
        </View>

        {!hasModelsAccess ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedKicker}>MODELS ACCESS REQUIRED</Text>
            <Text style={styles.lockedTitle}>Detailed production scorecards are protected.</Text>
            <Text style={styles.lockedBody}>
              Models or Complete access unlocks both accuracy views, normalized forecast pips and
              the full stored prediction ledger.
            </Text>
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}
            >
              <Text style={styles.unlockButtonText}>View subscription plans</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#38bdf8" size="large" />
            <Text style={styles.loadingText}>Rebuilding honest scorecards...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <Metric
                label="Independent evaluated"
                value={String(aggregate.independent.evaluated)}
              />
              <Metric
                label="Independent accuracy"
                value={percent(aggregate.independent.accuracy)}
                tone="good"
              />
              <Metric
                label="All published evaluated"
                value={String(aggregate.all.evaluated)}
              />
              <Metric
                label="All published pending"
                value={String(aggregate.all.pending)}
                tone="pending"
              />
              <Metric
                label="Normalized independent pips"
                value={`${signed(aggregate.independent.forecastPips)} pips`}
                tone={aggregate.independent.forecastPips >= 0 ? "good" : "bad"}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionKicker}>ACTIVE PRODUCTION MODELS</Text>
              <Text style={styles.sectionTitle}>Dual live scorecards</Text>
              <Text style={styles.sectionBody}>
                Models below 55% on at least eight completed independent episodes are removed from
                the commercial catalog until they requalify.
              </Text>
            </View>

            {loaded.map((item) => (
              <ModelScorecard key={item.model.modelKey} item={item} />
            ))}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionKicker}>PREDICTION LEDGER</Text>
              <Text style={styles.sectionTitle}>Every published timestamp remains visible</Text>
              <Text style={styles.sectionBody}>
                “Independent” marks the rows used by the release scorecard. Overlapping rows remain
                stored for transparency, but they do not pretend to be separate trade ideas.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              <FilterButton active={modelFilter === "all"} label="All models" onPress={() => setModelFilter("all")} />
              {loaded.map((item) => (
                <FilterButton
                  key={item.model.modelKey}
                  active={modelFilter === item.model.modelKey}
                  label={item.model.shortName}
                  onPress={() => setModelFilter(item.model.modelKey)}
                />
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {(["all", "correct", "incorrect", "pending"] as StatusFilter[]).map((status) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </ScrollView>

            <View style={styles.ledger}>
              {ledger.map(({ model, row }) => {
                const result = outcome(row);
                const pips = normalizedForecastPips(row);
                const independent = independentKeys.has(rowKey(row));
                const resultColor = result === "correct"
                  ? "#6ee7b7"
                  : result === "incorrect"
                    ? "#fda4af"
                    : "#fde68a";

                return (
                  <View key={`${model.modelKey}-${row.predictionTimeUtc}`} style={styles.ledgerRow}>
                    <View style={styles.ledgerMain}>
                      <Text style={styles.ledgerModel}>{model.shortName}</Text>
                      <Text style={styles.ledgerDate}>{formatDate(row.predictionTimeUtc)}</Text>
                      <Text style={styles.ledgerBias}>{row.bias}</Text>
                    </View>
                    <View style={styles.ledgerResult}>
                      <Text style={[styles.ledgerOutcome, { color: resultColor }]}>
                        {result.toUpperCase()}
                      </Text>
                      <Text style={styles.ledgerPips}>
                        {pips === null ? "Pips pending" : `${signed(pips)} pips`}
                      </Text>
                      <Text style={[styles.episodeTag, independent && styles.episodeTagIndependent]}>
                        {independent ? "INDEPENDENT" : "OVERLAPPING"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.methodCard}>
              <Text style={styles.methodKicker}>HOW RESULTS ARE CALCULATED</Text>
              <Text style={styles.methodTitle}>One ledger, two honest samples.</Text>
              <Text style={styles.methodBody}>
                All-published accuracy scores every stored production forecast after its full
                horizon closes. Independent accuracy greedily selects the first eligible forecast,
                then waits one complete model horizon before selecting another. A model needs at
                least eight evaluated independent episodes and 55% accuracy to remain in the
                commercial catalog. Forecast pips use 0.0001 for standard FX pairs and 0.01 for JPY
                pairs. Trade-management outcomes remain separate from terminal forecast pips.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050505" },
  content: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  pressed: { opacity: 0.7 },
  hero: { maxWidth: 940, marginBottom: 24 },
  eyebrow: { color: "#38bdf8", fontSize: 10, fontWeight: "900", letterSpacing: 2.5 },
  heroTitle: { marginTop: 13, color: "#ffffff", fontSize: 42, lineHeight: 49, fontWeight: "900" },
  heroBody: { marginTop: 13, color: "#a1a1aa", fontSize: 15, lineHeight: 25 },
  loadingCard: { minHeight: 220, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#27272a", borderRadius: 24, backgroundColor: "#0c0c0e" },
  loadingText: { marginTop: 14, color: "#a1a1aa", fontWeight: "700" },
  lockedCard: { borderWidth: 1, borderColor: "#4c1d95", borderRadius: 25, backgroundColor: "#120b20", padding: 24 },
  lockedKicker: { color: "#c4b5fd", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  lockedTitle: { marginTop: 10, color: "#ffffff", fontSize: 25, fontWeight: "900" },
  lockedBody: { marginTop: 9, maxWidth: 720, color: "#a1a1aa", fontSize: 14, lineHeight: 23 },
  unlockButton: { alignSelf: "flex-start", marginTop: 18, borderRadius: 14, backgroundColor: "#7c3aed", paddingHorizontal: 18, paddingVertical: 13 },
  unlockButtonText: { color: "#ffffff", fontWeight: "900" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 25 },
  metric: { flexGrow: 1, flexBasis: 145, minWidth: 130, borderWidth: 1, borderColor: "#27272a", borderRadius: 17, backgroundColor: "#09090b", padding: 14 },
  metricLabel: { color: "#71717a", fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  metricValue: { marginTop: 7, fontSize: 20, fontWeight: "900" },
  sectionHeader: { marginTop: 19, marginBottom: 14 },
  sectionKicker: { color: "#38bdf8", fontSize: 10, fontWeight: "900", letterSpacing: 2.1 },
  sectionTitle: { marginTop: 8, color: "#ffffff", fontSize: 29, fontWeight: "900" },
  sectionBody: { marginTop: 7, maxWidth: 850, color: "#a1a1aa", fontSize: 13, lineHeight: 21 },
  modelCard: { marginBottom: 14, borderWidth: 1, borderColor: "#27272a", borderRadius: 25, backgroundColor: "#0c0c0e", padding: 20 },
  modelHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  modelCopy: { flex: 1, minWidth: 230 },
  modelName: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  modelMeta: { marginTop: 5, color: "#71717a", fontSize: 12 },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  statusBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  dualGrid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  scorePanel: { flexGrow: 1, flexBasis: 480, borderWidth: 1, borderColor: "#27272a", borderRadius: 20, backgroundColor: "#111113", padding: 16 },
  scoreTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  scoreSubtitle: { marginTop: 5, color: "#71717a", fontSize: 11, lineHeight: 17 },
  metricsRow: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorText: { marginTop: 12, color: "#fda4af", fontSize: 12 },
  filters: { gap: 8, paddingBottom: 10 },
  filterButton: { borderWidth: 1, borderColor: "#27272a", borderRadius: 999, backgroundColor: "#09090b", paddingHorizontal: 14, paddingVertical: 9 },
  filterButtonActive: { borderColor: "#38bdf8", backgroundColor: "#082f49" },
  filterText: { color: "#a1a1aa", fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: "#bae6fd" },
  ledger: { marginTop: 5, gap: 8 },
  ledgerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: "#202026", borderRadius: 18, backgroundColor: "#09090b", padding: 15 },
  ledgerMain: { flexGrow: 1, flexBasis: 300 },
  ledgerModel: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  ledgerDate: { marginTop: 4, color: "#71717a", fontSize: 10 },
  ledgerBias: { marginTop: 7, color: "#d4d4d8", fontSize: 12, fontWeight: "800" },
  ledgerResult: { alignItems: "flex-end", justifyContent: "center", minWidth: 145 },
  ledgerOutcome: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  ledgerPips: { marginTop: 5, color: "#d4d4d8", fontSize: 12, fontWeight: "800" },
  episodeTag: { marginTop: 6, color: "#71717a", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  episodeTagIndependent: { color: "#7dd3fc" },
  methodCard: { marginTop: 25, borderWidth: 1, borderColor: "#0c4a6e", borderRadius: 25, backgroundColor: "#071820", padding: 21 },
  methodKicker: { color: "#7dd3fc", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  methodTitle: { marginTop: 9, color: "#ffffff", fontSize: 24, fontWeight: "900" },
  methodBody: { marginTop: 9, color: "#a1a1aa", fontSize: 13, lineHeight: 22 },
});
