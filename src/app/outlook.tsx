import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { OUTLOOK_STRUCTURE } from "../config/outlookContent";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchOutlookFeed,
  type OutlookArticle,
} from "../services/outlookApi";

function formatPublishedAt(value: string) {
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

function ChartCard({
  label,
  url,
  alt,
  caption,
}: {
  label: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
}) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartLabel}>{label}</Text>
      <Image
        source={{ uri: url }}
        accessibilityLabel={alt ?? label}
        resizeMode="contain"
        style={styles.chartImage}
      />
      {caption ? <Text style={styles.chartCaption}>{caption}</Text> : null}
    </View>
  );
}

function StructureList() {
  return (
    <View style={styles.structureCard}>
      <Text style={styles.structureTitle}>Every publication can include</Text>
      <View style={styles.structureGrid}>
        {OUTLOOK_STRUCTURE.map((item) => (
          <View key={item} style={styles.structureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.structureText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionCard({
  section,
  index,
}: {
  section: OutlookArticle["sections"][number];
  index: number;
}) {
  const isInvalidation = section.key === "invalidation";
  const isBase = section.key === "base_scenario";
  const isAlternative = section.key === "alternative_scenario";

  return (
    <View
      style={[
        styles.sectionCard,
        isInvalidation && styles.invalidationCard,
        isBase && styles.baseCard,
        isAlternative && styles.alternativeCard,
      ]}
    >
      <Text
        style={[
          styles.sectionNumber,
          isInvalidation && styles.invalidationAccent,
          isBase && styles.baseAccent,
        ]}
      >
        {String(index + 1).padStart(2, "0")}
      </Text>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionBody}>{section.body}</Text>
      </View>
    </View>
  );
}

export default function OutlookScreen() {
  const {
    isAuthenticated,
    hasOutlookAccess,
    profileLoading,
    isAdmin,
  } = useAuth();

  const [outlooks, setOutlooks] = useState<OutlookArticle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [databaseBacked, setDatabaseBacked] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      refresh ? setRefreshing(true) : setLoading(true);

      try {
        const result = await fetchOutlookFeed(hasOutlookAccess);
        setOutlooks(result.outlooks);
        setDatabaseBacked(result.databaseBacked);
        setWarning(result.warning);
        setSelectedId((current) =>
          result.outlooks.some((item) => item.id === current)
            ? current
            : result.outlooks[0]?.id ?? ""
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasOutlookAccess]
  );

  useEffect(() => {
    if (!profileLoading) void load();
  }, [load, profileLoading]);

  const selected = useMemo(
    () => outlooks.find((item) => item.id === selectedId) ?? outlooks[0] ?? null,
    [outlooks, selectedId]
  );
  const selectedIsLatest = Boolean(
    selected && outlooks[0] && selected.id === outlooks[0].id
  );

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor="#38bdf8"
          />
        }
      >
        <AppTopNav />

        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>TRADER-LED MARKET RESEARCH</Text>
            </View>
            <View style={databaseBacked ? styles.liveBadge : styles.fallbackBadge}>
              <Text style={styles.feedBadgeText}>
                {databaseBacked ? "LIVE ARCHIVE" : "LOCAL FALLBACK"}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Technical & Fundamental Outlook</Text>
          <Text style={styles.heroDescription}>
            Dated market theses combining macro conditions, monetary policy, sentiment,
            technical structure, scenarios and invalidation. Every earlier publication
            remains available, because deleting old opinions is not analysis.
          </Text>

          <View style={styles.heroActions}>
            <View
              style={
                hasOutlookAccess
                  ? styles.accessActiveBanner
                  : styles.accessPreviewBanner
              }
            >
              <Text
                style={
                  hasOutlookAccess
                    ? styles.accessActiveTitle
                    : styles.accessPreviewTitle
                }
              >
                {hasOutlookAccess
                  ? "Full Outlook access is active"
                  : "Public preview mode"}
              </Text>
              <Text style={styles.accessBody}>
                {hasOutlookAccess
                  ? "Complete publications, both chart layers and the historical archive are unlocked."
                  : "The first two sentences remain public. Complete analysis and charts require Outlook or Complete access."}
              </Text>
            </View>

            {isAdmin ? (
              <Pressable
                onPress={() => router.push("/admin-outlook" as never)}
                style={({ pressed }) => [styles.publishButton, pressed && styles.pressed]}
              >
                <Text style={styles.publishButtonText}>Publish new Outlook</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {warning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Outlook feed notice</Text>
            <Text style={styles.warningBody}>{warning}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Loading Outlook archive...</Text>
          </View>
        ) : selected ? (
          <View style={styles.articleCard}>
            <View style={styles.articleHeaderRow}>
              <View style={styles.articleHeaderCopy}>
                <Text style={styles.articleKicker}>
                  {selectedIsLatest ? "LATEST OUTLOOK" : "ARCHIVED OUTLOOK"}
                </Text>
                <Text style={styles.articleTitle}>{selected.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>By {selected.author}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>
                      {formatPublishedAt(selected.publishedAt)}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>
                      {selected.commentaryType.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={selectedIsLatest ? styles.currentBadge : styles.archiveBadge}
              >
                <Text style={styles.statusBadgeText}>
                  {selectedIsLatest ? "CURRENT" : "ARCHIVE"}
                </Text>
              </View>
            </View>

            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>PUBLIC PREVIEW</Text>
              {selected.preview.slice(0, 2).map((sentence, index) => (
                <Text
                  key={`${selected.id}-${index}`}
                  style={styles.previewSentence}
                >
                  {sentence}
                </Text>
              ))}
            </View>

            {hasOutlookAccess ? (
              <View style={styles.fullAnalysis}>
                {selected.chartImageUrl ? (
                  <ChartCard
                    label="MACRO / FUNDAMENTAL CHART"
                    url={selected.chartImageUrl}
                    alt={selected.chartImageAlt}
                    caption={selected.chartImageCaption}
                  />
                ) : null}

                {selected.sections.map((section, index) => (
                  <React.Fragment key={section.key}>
                    {section.key === "technical_structure" &&
                    selected.technicalChartImageUrl ? (
                      <ChartCard
                        label="TECHNICAL CHART"
                        url={selected.technicalChartImageUrl}
                        alt={selected.technicalChartImageAlt}
                        caption={selected.technicalChartImageCaption}
                      />
                    ) : null}
                    <SectionCard section={section} index={index} />
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.lockedCard}>
                <Text style={styles.lockedKicker}>PREMIUM OUTLOOK</Text>
                <Text style={styles.lockedTitle}>The complete market thesis is locked.</Text>
                <Text style={styles.lockedBody}>
                  Outlook access includes the full macro thesis, fundamental and technical
                  charts, weekly updates, scenarios, invalidation and every archived publication.
                </Text>
                <StructureList />
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>OUTLOOK ACCESS</Text>
                    <Text style={styles.price}>€25</Text>
                    <Text style={styles.pricePeriod}>per month</Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      router.push((isAuthenticated ? "/pricing" : "/login") as never)
                    }
                    style={({ pressed }) => [
                      styles.unlockButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.unlockButtonText}>
                      {isAuthenticated ? "View Outlook plan" : "Create account"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Outlook has been published yet</Text>
            <Text style={styles.emptyBody}>
              The first reviewed publication will appear here.
            </Text>
          </View>
        )}

        <View style={styles.archiveHeader}>
          <Text style={styles.archiveKicker}>HISTORICAL ARCHIVE</Text>
          <Text style={styles.archiveTitle}>Previous outlooks</Text>
          <Text style={styles.archiveDescription}>
            Select any publication to inspect its original thesis, date and invalidation.
          </Text>
        </View>

        <View style={styles.archiveGrid}>
          {outlooks.map((outlook, index) => {
            const isSelected = selected?.id === outlook.id;

            return (
              <Pressable
                key={outlook.id}
                onPress={() => setSelectedId(outlook.id)}
                style={({ pressed }) => [
                  styles.archiveItem,
                  isSelected && styles.archiveItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={
                    isSelected
                      ? styles.archiveItemStateActive
                      : styles.archiveItemState
                  }
                >
                  {index === 0 ? "CURRENT" : "ARCHIVED"}
                </Text>
                <Text style={styles.archiveItemTitle}>{outlook.title}</Text>
                <Text style={styles.archiveItemMeta}>
                  {formatPublishedAt(outlook.publishedAt)} · {outlook.author}
                </Text>
                <Text style={styles.archiveArrow}>Open →</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.disclaimer}>
          Educational market commentary only. Not financial advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050505" },
  scrollContent: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  pressed: { opacity: 0.7 },
  hero: { marginBottom: 26 },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 999,
    backgroundColor: "#071820",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  liveBadge: {
    borderWidth: 1,
    borderColor: "#064e3b",
    borderRadius: 999,
    backgroundColor: "#061713",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  fallbackBadge: {
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 999,
    backgroundColor: "#1c1207",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  feedBadgeText: {
    color: "#f4f4f5",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  heroDescription: {
    marginTop: 13,
    maxWidth: 850,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 27,
  },
  heroActions: {
    marginTop: 19,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 12,
  },
  accessActiveBanner: {
    flexGrow: 1,
    flexBasis: 500,
    borderWidth: 1,
    borderColor: "#064e3b",
    borderRadius: 20,
    backgroundColor: "#061713",
    padding: 16,
  },
  accessPreviewBanner: {
    flexGrow: 1,
    flexBasis: 500,
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 20,
    backgroundColor: "#071820",
    padding: 16,
  },
  accessActiveTitle: { color: "#6ee7b7", fontSize: 15, fontWeight: "900" },
  accessPreviewTitle: { color: "#7dd3fc", fontSize: 15, fontWeight: "900" },
  accessBody: { marginTop: 6, color: "#a1a1aa", fontSize: 13, lineHeight: 21 },
  publishButton: {
    minWidth: 190,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 18,
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  publishButtonText: { color: "#ffffff", fontWeight: "900" },
  warningCard: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 20,
    backgroundColor: "#1c1207",
    padding: 16,
  },
  warningTitle: { color: "#fde68a", fontSize: 15, fontWeight: "900" },
  warningBody: { marginTop: 7, color: "#fef3c7", fontSize: 13, lineHeight: 20 },
  loadingCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 27,
    backgroundColor: "#09090b",
  },
  loadingText: { marginTop: 13, color: "#a1a1aa", fontWeight: "800" },
  articleCard: {
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 28,
    backgroundColor: "#071018",
    padding: 21,
  },
  articleHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  articleHeaderCopy: { flex: 1 },
  articleKicker: { color: "#7dd3fc", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  articleTitle: { marginTop: 10, color: "#ffffff", fontSize: 31, lineHeight: 38, fontWeight: "900" },
  currentBadge: {
    borderWidth: 1,
    borderColor: "#064e3b",
    borderRadius: 999,
    backgroundColor: "#061713",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  archiveBadge: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 999,
    backgroundColor: "#18181b",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusBadgeText: { color: "#f4f4f5", fontSize: 9, fontWeight: "900" },
  metaRow: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metaPill: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 999,
    backgroundColor: "#18181b",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  metaText: { color: "#d4d4d8", fontSize: 11, fontWeight: "800" },
  previewBlock: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#164e63",
    borderRadius: 20,
    backgroundColor: "#082f49",
    padding: 17,
  },
  previewLabel: { color: "#7dd3fc", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  previewSentence: { marginTop: 10, color: "#f4f4f5", fontSize: 16, lineHeight: 27, fontWeight: "600" },
  fullAnalysis: { marginTop: 18 },
  chartCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 14,
    overflow: "hidden",
  },
  chartLabel: { marginBottom: 11, color: "#7dd3fc", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  chartImage: { width: "100%", minHeight: 260, aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: "#ffffff" },
  chartCaption: { marginTop: 11, color: "#a1a1aa", fontSize: 12, lineHeight: 19 },
  sectionCard: {
    marginBottom: 13,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 21,
    backgroundColor: "#0c0c0e",
    padding: 17,
  },
  baseCard: { borderColor: "#064e3b", backgroundColor: "#07110e" },
  alternativeCard: { borderColor: "#713f12", backgroundColor: "#171006" },
  invalidationCard: { borderColor: "#881337", backgroundColor: "#1c0710" },
  sectionNumber: { width: 38, color: "#38bdf8", fontSize: 11, fontWeight: "900" },
  baseAccent: { color: "#6ee7b7" },
  invalidationAccent: { color: "#fda4af" },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  sectionBody: { marginTop: 8, color: "#d4d4d8", fontSize: 14, lineHeight: 24 },
  lockedCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 23,
    backgroundColor: "#120b20",
    padding: 19,
  },
  lockedKicker: { color: "#c4b5fd", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  lockedTitle: { marginTop: 10, color: "#ffffff", fontSize: 24, lineHeight: 30, fontWeight: "900" },
  lockedBody: { marginTop: 9, color: "#d4d4d8", fontSize: 14, lineHeight: 22 },
  structureCard: {
    marginTop: 17,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 19,
    backgroundColor: "#1e1b4b",
    padding: 15,
  },
  structureTitle: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  structureGrid: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  structureRow: { flexGrow: 1, flexBasis: 290, flexDirection: "row", alignItems: "flex-start", paddingTop: 6 },
  checkmark: { marginRight: 9, color: "#6ee7b7", fontWeight: "900" },
  structureText: { flex: 1, color: "#e4e4e7", fontSize: 13, lineHeight: 20 },
  priceRow: {
    marginTop: 17,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderWidth: 1,
    borderColor: "#6d28d9",
    borderRadius: 19,
    backgroundColor: "#1e1b4b",
    padding: 15,
  },
  priceLabel: { color: "#c4b5fd", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  price: { marginTop: 4, color: "#ffffff", fontSize: 30, fontWeight: "900" },
  pricePeriod: { color: "#a1a1aa", fontSize: 11 },
  unlockButton: {
    minWidth: 175,
    borderWidth: 1,
    borderColor: "#c084fc",
    borderRadius: 16,
    backgroundColor: "#7e22ce",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  unlockButtonText: { color: "#ffffff", textAlign: "center", fontWeight: "900" },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 24,
    backgroundColor: "#09090b",
    padding: 21,
  },
  emptyTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  emptyBody: { marginTop: 8, color: "#a1a1aa", fontSize: 14, lineHeight: 22 },
  archiveHeader: { marginTop: 34, marginBottom: 14 },
  archiveKicker: { color: "#71717a", fontSize: 9, fontWeight: "900", letterSpacing: 2.1 },
  archiveTitle: { marginTop: 8, color: "#ffffff", fontSize: 28, fontWeight: "900" },
  archiveDescription: { marginTop: 8, color: "#a1a1aa", fontSize: 14, lineHeight: 22 },
  archiveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  archiveItem: {
    flexGrow: 1,
    flexBasis: 330,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 21,
    backgroundColor: "#09090b",
    padding: 16,
  },
  archiveItemSelected: { borderColor: "#0c4a6e", backgroundColor: "#071820" },
  archiveItemState: { color: "#71717a", fontSize: 8, fontWeight: "900", letterSpacing: 1.5 },
  archiveItemStateActive: { color: "#7dd3fc", fontSize: 8, fontWeight: "900", letterSpacing: 1.5 },
  archiveItemTitle: { marginTop: 7, color: "#ffffff", fontSize: 17, fontWeight: "900" },
  archiveItemMeta: { marginTop: 6, color: "#a1a1aa", fontSize: 11 },
  archiveArrow: { marginTop: 14, color: "#7dd3fc", fontSize: 12, fontWeight: "900" },
  disclaimer: { marginTop: 24, color: "#52525b", textAlign: "center", fontSize: 11, lineHeight: 18 },
});
