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

type StatusFilter = "all" | "evaluated" | "pending" | "correct" | "incorrect";

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function pipsFor(row: ExtendedHistoryRow) {
  if (finite(row.tradeNetPips)) return Number(row.tradeNetPips);
  if (finite(row.netPips)) return Number(row.netPips);
  return null;
}

function rowStatus(row: ExtendedHistoryRow) {
  if (String(row.evaluationStatus).toLowerCase() !== "evaluated") return "pending";
  if (row.directionHit === true) return "correct";
  if (row.directionHit === false) return "incorrect";
  return "evaluated";
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

function signed(value: number | null) {
  if (!finite(value)) return "N/A";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(1)}`;
}

function percent(value: number | null) {
  if (!finite(value)) return "Collecting";
  return `${(Number(value) * 100).toFixed(1)}%`;
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
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

function ModelSummaryCard({ item }: { item: LoadedModelHistory }) {
  const evaluated = item.rows.filter((row) => rowStatus(row) !== "pending");
  const correct = evaluated.filter((row) => row.directionHit === true).length;
  const incorrect = evaluated.filter((row) => row.directionHit === false).length;
  const directional = correct + incorrect;
  const accuracy = directional ? correct / directional : null;
  const netPips = item.rows.reduce((sum, row) => sum + (pipsFor(row) ?? 0), 0);
  const pending = item.rows.filter((row) => rowStatus(row) === "pending").length;

  return (
    <View style={styles.modelCard}>
      <View style={styles.modelCardHeader}>
        <View style={styles.modelCardCopy}>
          <Text style={styles.modelName}>{item.model.displayName}</Text>
          <Text style={styles.modelMeta}>
            {item.model.asset} · {item.model.horizonH}h · {item.model.tier}
          </Text>
        </View>
        <View style={styles.modelPipsBadge}>
          <Text style={styles.modelPipsValue}>{signed(netPips)} pips</Text>
        </View>
      </View>

      <View style={styles.modelMetrics}>
        <View style={styles.modelMetric}>
          <Text style={styles.modelMetricLabel}>Accuracy</Text>
          <Text style={styles.modelMetricValue}>{percent(accuracy)}</Text>
        </View>
        <View style={styles.modelMetric}>
          <Text style={styles.modelMetricLabel}>Correct</Text>
          <Text style={[styles.modelMetricValue, { color: "#6ee7b7" }]}>{correct}</Text>
        </View>
        <View style={styles.modelMetric}>
          <Text style={styles.modelMetricLabel}>Incorrect</Text>
          <Text style={[styles.modelMetricValue, { color: "#fda4af" }]}>{incorrect}</Text>
        </View>
        <View style={styles.modelMetric}>
          <Text style={styles.modelMetricLabel}>Pending</Text>
          <Text style={[styles.modelMetricValue, { color: "#fde68a" }]}>{pending}</Text>
        </View>
      </View>

      {item.error ? <Text style={styles.modelError}>{item.error}</Text> : null}
    </View>
  );
}

function FilterButton({
  active,
  label,
  onPress,
}: {
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

function HistoryRow({ model, row }: { model: ModelDefinition; row: ExtendedHistoryRow }) {
  const status = rowStatus(row);
  const statusColor = status === "correct"
    ? "#6ee7b7"
    : status === "incorrect"
      ? "#fda4af"
      : status === "pending"
        ? "#fde68a"
        : "#bae6fd";
  const resultLabel = status === "correct"
    ? "CORRECT"
    : status === "incorrect"
      ? "INCORRECT"
      : status === "pending"
        ? "PENDING"
        : "EVALUATED";
  const pips = pipsFor(row);

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyMain}>
        <View style={styles.historyIdentity}>
          <Text style={styles.historyModel}>{model.shortName}</Text>
          <Text style={styles.historyDate}>{formatDate(row.predictionTimeUtc)}</Text>
        </View>
        <View style={styles.historyBiasWrap}>
          <Text style={styles.historyBias}>{row.bias}</Text>
          <Text style={styles.historyConfidence}>
            {finite(row.confidence) ? `${(Number(row.confidence) * 100).toFixed(0)}% confidence` : "Confidence unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.historyResults}>
        <View style={[styles.statusPill, { borderColor: statusColor }]}> 
          <Text style={[styles.statusText, { color: statusColor }]}>{resultLabel}</Text>
        </View>
        <Text style={[styles.historyPips, { color: pips !== null && pips >= 0 ? "#6ee7b7" : "#fda4af" }]}>
          {pips === null ? "Pips pending" : `${signed(pips)} pips`}
        </Text>
      </View>

      {row.tradeResult || row.forecastResult ? (
        <View style={styles.resultDetails}>
          <Text style={styles.resultDetailText}>
            Forecast: {row.forecastResult ?? resultLabel}
          </Text>
          <Text style={styles.resultDetailText}>
            Trade management: {row.tradeResult ?? "Not finalized"}
          </Text>
          {finite(row.mfePips) || finite(row.maePips) ? (
            <Text style={styles.resultDetailText}>
              MFE {signed(row.mfePips ?? null)} · MAE {signed(row.maePips ?? null)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function PerformanceScreen() {
  const { hasModelsAccess } = useAuth();
  const [loaded, setLoaded] = useState<LoadedModelHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const visibleModels = hasModelsAccess
        ? MODEL_CATALOG
        : MODEL_CATALOG.filter((model) => model.tier === "Free");

      const results = await Promise.all(
        visibleModels.map(async (model) => {
          try {
            const rows = await fetchExactModelHistory(model, 250);
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
    const rows = loaded.flatMap((item) => item.rows);
    const correct = rows.filter((row) => rowStatus(row) === "correct").length;
    const incorrect = rows.filter((row) => rowStatus(row) === "incorrect").length;
    const pending = rows.filter((row) => rowStatus(row) === "pending").length;
    const directional = correct + incorrect;
    const netPips = rows.reduce((sum, row) => sum + (pipsFor(row) ?? 0), 0);

    return {
      rows,
      correct,
      incorrect,
      pending,
      accuracy: directional ? correct / directional : null,
      netPips,
    };
  }, [loaded]);

  const filteredRows = useMemo(() => {
    return loaded
      .flatMap((item) => item.rows.map((row) => ({ model: item.model, row })))
      .filter(({ model }) => modelFilter === "all" || model.modelKey === modelFilter)
      .filter(({ row }) => statusFilter === "all" || rowStatus(row) === statusFilter)
      .sort((left, right) => right.row.predictionTimeUtc.localeCompare(left.row.predictionTimeUtc))
      .slice(0, 120);
  }, [loaded, modelFilter, statusFilter]);

  return (
    <SafeAreaView
      style={[
        styles.page,
        Platform.OS === "web" ? ({ height: "100vh" } as any) : null,
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppTopNav />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LIVE MODEL PERFORMANCE</Text>
          <Text style={styles.heroTitle}>Every prediction leaves a record.</Text>
          <Text style={styles.heroBody}>
            Correct, incorrect and pending outcomes are stored with signed pips. Forecast
            accuracy and trade-management results remain separate, because combining them
            would make the numbers prettier and the product worse.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#38bdf8" size="large" />
            <Text style={styles.loadingText}>Loading stored prediction history...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Evaluated predictions"
                value={String(aggregate.correct + aggregate.incorrect)}
                note="Directional predictions with a completed model horizon."
              />
              <StatCard
                label="Correct"
                value={String(aggregate.correct)}
                note="Terminal direction matched the model signal."
                tone="good"
              />
              <StatCard
                label="Incorrect"
                value={String(aggregate.incorrect)}
                note="Terminal direction finished against the model signal."
                tone="bad"
              />
              <StatCard
                label="Pending"
                value={String(aggregate.pending)}
                note="The full 3h, 6h or 12h horizon has not closed yet."
                tone="pending"
              />
              <StatCard
                label="Directional accuracy"
                value={percent(aggregate.accuracy)}
                note="Neutral monitoring rows are excluded."
                tone="good"
              />
              <StatCard
                label="Recorded net pips"
                value={`${signed(aggregate.netPips)} pips`}
                note="Trade-management pips where available, otherwise signed model pips."
                tone={aggregate.netPips >= 0 ? "good" : "bad"}
              />
            </View>

            {!hasModelsAccess ? (
              <View style={styles.lockedCard}>
                <Text style={styles.lockedKicker}>PRO PERFORMANCE ANALYTICS</Text>
                <Text style={styles.lockedTitle}>The complete six-model history is locked.</Text>
                <Text style={styles.lockedBody}>
                  The free GBPUSD model remains visible. Subscribe to Models or Complete
                  access to compare every model, inspect all outcomes and filter the full history.
                </Text>
                <Pressable
                  onPress={() => router.push("/pricing" as never)}
                  style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}
                >
                  <Text style={styles.unlockButtonText}>View subscription plans</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionKicker}>BY MODEL</Text>
              <Text style={styles.sectionTitle}>Live scorecards</Text>
              <Text style={styles.sectionBody}>
                Each product keeps its own sample, hit rate, pending count and signed-pip record.
              </Text>
            </View>
            <View style={styles.modelGrid}>
              {loaded.map((item) => <ModelSummaryCard key={item.model.modelKey} item={item} />)}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionKicker}>PREDICTION LEDGER</Text>
              <Text style={styles.sectionTitle}>Stored outcomes</Text>
              <Text style={styles.sectionBody}>
                Filter the ledger by model and result. Pending rows remain visible until their
                forecast horizon closes and the performance updater receives the required MT5 bar.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
              {(["all", "correct", "incorrect", "pending", "evaluated"] as StatusFilter[]).map((status) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </ScrollView>

            <View style={styles.historyList}>
              {filteredRows.length ? (
                filteredRows.map(({ model, row }) => (
                  <HistoryRow key={`${model.modelKey}-${row.modelKey}-${row.predictionTimeUtc}`} model={model} row={row} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No rows match this filter</Text>
                  <Text style={styles.emptyBody}>Try another model or outcome state.</Text>
                </View>
              )}
            </View>

            <View style={styles.methodologyCard}>
              <Text style={styles.methodologyKicker}>HOW RESULTS ARE CALCULATED</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyItem}>
                  <Text style={styles.methodologyNumber}>01</Text>
                  <Text style={styles.methodologyTitle}>Terminal forecast result</Text>
                  <Text style={styles.methodologyBody}>
                    Bullish or bearish is compared with the actual closed MT5 price after the complete model horizon. A 12-hour signal does not become correct merely because it was profitable after eight hours.
                  </Text>
                </View>
                <View style={styles.methodologyItem}>
                  <Text style={styles.methodologyNumber}>02</Text>
                  <Text style={styles.methodologyTitle}>Trade-management result</Text>
                  <Text style={styles.methodologyBody}>
                    When price reaches +40 pips, 50% can be secured and the remaining half moves to break-even. If the runner returns to entry, the trade result is Half Profit + BE, equal to +20 gross pips.
                  </Text>
                </View>
                <View style={styles.methodologyItem}>
                  <Text style={styles.methodologyNumber}>03</Text>
                  <Text style={styles.methodologyTitle}>MFE and MAE</Text>
                  <Text style={styles.methodologyBody}>
                    Maximum favourable and adverse excursion describe the best and worst path after publication. Ambiguous intrabar sequences are not optimistically guessed.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <Text style={styles.disclaimer}>
          Educational performance reporting only. Small live samples can change materially across market regimes.
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
    marginBottom: 28,
    maxWidth: 820,
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.6,
  },
  heroTitle: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 44,
    lineHeight: 51,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  heroBody: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 27,
  },
  loadingCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 26,
    backgroundColor: "#09090b",
  },
  loadingText: {
    marginTop: 13,
    color: "#a1a1aa",
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    minHeight: 145,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 22,
    backgroundColor: "#0c0c0e",
    padding: 17,
  },
  statLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 12,
    fontSize: 27,
    fontWeight: "900",
  },
  statNote: {
    marginTop: 9,
    color: "#71717a",
    fontSize: 11,
    lineHeight: 17,
  },
  lockedCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 24,
    backgroundColor: "#120b20",
    padding: 20,
  },
  lockedKicker: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  lockedTitle: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  lockedBody: {
    marginTop: 10,
    maxWidth: 760,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  unlockButton: {
    alignSelf: "flex-start",
    minHeight: 50,
    marginTop: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 16,
    backgroundColor: "#6d28d9",
    paddingHorizontal: 18,
  },
  unlockButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  sectionHeader: {
    marginTop: 34,
    marginBottom: 15,
  },
  sectionKicker: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  sectionTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "900",
  },
  sectionBody: {
    marginTop: 8,
    maxWidth: 780,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 23,
  },
  modelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modelCard: {
    flexGrow: 1,
    flexBasis: 350,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 23,
    backgroundColor: "#0c0c0e",
    padding: 18,
  },
  modelCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modelCardCopy: {
    flex: 1,
  },
  modelName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  modelMeta: {
    marginTop: 5,
    color: "#71717a",
    fontSize: 11,
  },
  modelPipsBadge: {
    borderWidth: 1,
    borderColor: "#064e3b",
    borderRadius: 999,
    backgroundColor: "#061713",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  modelPipsValue: {
    color: "#6ee7b7",
    fontSize: 11,
    fontWeight: "900",
  },
  modelMetrics: {
    marginTop: 17,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modelMetric: {
    flexGrow: 1,
    minWidth: 75,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 14,
    backgroundColor: "#09090b",
    padding: 10,
  },
  modelMetricLabel: {
    color: "#71717a",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modelMetricValue: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  modelError: {
    marginTop: 11,
    color: "#fda4af",
    fontSize: 11,
    lineHeight: 17,
  },
  filtersRow: {
    paddingBottom: 10,
    gap: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 999,
    backgroundColor: "#0c0c0e",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterButtonActive: {
    borderColor: "#38bdf8",
    backgroundColor: "#082f49",
  },
  filterText: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "800",
  },
  filterTextActive: {
    color: "#e0f2fe",
  },
  historyList: {
    marginTop: 5,
    gap: 10,
  },
  historyRow: {
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 21,
    backgroundColor: "#0c0c0e",
    padding: 16,
  },
  historyMain: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  historyIdentity: {
    flex: 1,
    minWidth: 190,
  },
  historyModel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  historyDate: {
    marginTop: 5,
    color: "#71717a",
    fontSize: 10,
  },
  historyBiasWrap: {
    alignItems: "flex-end",
  },
  historyBias: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  historyConfidence: {
    marginTop: 4,
    color: "#71717a",
    fontSize: 10,
  },
  historyResults: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  historyPips: {
    fontSize: 14,
    fontWeight: "900",
  },
  resultDetails: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#202026",
    paddingTop: 11,
    gap: 5,
  },
  resultDetailText: {
    color: "#a1a1aa",
    fontSize: 11,
    lineHeight: 17,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 21,
    backgroundColor: "#09090b",
    padding: 18,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyBody: {
    marginTop: 7,
    color: "#71717a",
    fontSize: 12,
  },
  methodologyCard: {
    marginTop: 34,
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 26,
    backgroundColor: "#071820",
    padding: 21,
  },
  methodologyKicker: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  methodologyGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  methodologyItem: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 1,
    borderColor: "#164e63",
    borderRadius: 19,
    backgroundColor: "#06141b",
    padding: 16,
  },
  methodologyNumber: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  methodologyTitle: {
    marginTop: 9,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  methodologyBody: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 25,
    color: "#52525b",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
});
