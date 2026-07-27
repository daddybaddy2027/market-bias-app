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

function OutlookMeta({ outlook }: { outlook: OutlookArticle }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaPill}>
        <Text style={styles.metaText}>By {outlook.author}</Text>
      </View>
      <View style={styles.metaPill}>
        <Text style={styles.metaText}>{formatPublishedAt(outlook.publishedAt)}</Text>
      </View>
    </View>
  );
}

function StructureList() {
  return (
    <View style={styles.structureCard}>
      <Text style={styles.structureTitle}>What each publication can include</Text>
      {OUTLOOK_STRUCTURE.map((item) => (
        <View key={item} style={styles.structureRow}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.structureText}>{item}</Text>
        </View>
      ))}
      <Text style={styles.structureNote}>
        The author may adapt the order and emphasis to the weekly calendar,
        active market regime and the quality of the available thesis.
      </Text>
    </View>
  );
}

export default function OutlookScreen() {
  const {
    isAuthenticated,
    hasOutlookAccess,
    profileLoading,
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

        setSelectedId((current) => {
          if (result.outlooks.some((item) => item.id === current)) {
            return current;
          }
          return result.outlooks[0]?.id ?? "";
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasOutlookAccess]
  );

  useEffect(() => {
    if (!profileLoading) {
      void load();
    }
  }, [load, profileLoading]);

  const selected = useMemo(
    () =>
      outlooks.find((item) => item.id === selectedId) ?? outlooks[0] ?? null,
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
            tintColor="#7dd3fc"
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>HUMAN MARKET CONTEXT</Text>
            </View>
            <View style={databaseBacked ? styles.liveBadge : styles.fallbackBadge}>
              <Text style={styles.feedBadgeText}>
                {databaseBacked ? "LIVE ARCHIVE" : "LOCAL FALLBACK"}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Technical and Fundamental Outlook</Text>
          <Text style={styles.heroDescription}>
            Weekly macro, sentiment and technical analysis for the main FX
            currencies and pairs. New publications automatically become the current
            outlook, while every earlier thesis remains available in the archive.
          </Text>

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
                ? "You can read complete publications, technical charts and every available archived outlook."
                : "You can read the first two sentences and inspect the full research structure before subscribing."}
            </Text>
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
            <ActivityIndicator size="large" color="#7dd3fc" />
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
              </View>
              <View
                style={selectedIsLatest ? styles.currentBadge : styles.archiveBadge}
              >
                <Text style={styles.statusBadgeText}>
                  {selectedIsLatest ? "CURRENT" : "ARCHIVE"}
                </Text>
              </View>
            </View>

            <OutlookMeta outlook={selected} />

            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>PUBLIC PREVIEW</Text>
              {selected.preview.slice(0, 2).map((sentence, index) => (
                <Text key={`${selected.id}-${index}`} style={styles.previewSentence}>
                  {sentence}
                </Text>
              ))}
            </View>

            {hasOutlookAccess ? (
              <View style={styles.fullAnalysis}>
                {selected.chartImageUrl ? (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartLabel}>TECHNICAL CHART</Text>
                    <Image
                      source={{ uri: selected.chartImageUrl }}
                      accessibilityLabel={
                        selected.chartImageAlt ?? "Technical outlook chart"
                      }
                      resizeMode="contain"
                      style={styles.chartImage}
                    />
                    {selected.chartImageCaption ? (
                      <Text style={styles.chartCaption}>
                        {selected.chartImageCaption}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {selected.sections.map((section, index) => (
                  <View key={section.key} style={styles.sectionCard}>
                    <Text style={styles.sectionNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                    <View style={styles.sectionCopy}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <Text style={styles.sectionBody}>{section.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.lockedCard}>
                <Text style={styles.lockedKicker}>PREMIUM OUTLOOK</Text>
                <Text style={styles.lockedTitle}>The complete analysis is locked</Text>
                <Text style={styles.lockedBody}>
                  Full access includes the complete weekly thesis, event updates,
                  technical structure, chart images, alternative scenarios,
                  invalidation and the historical archive.
                </Text>

                <StructureList />

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>OUTLOOK ACCESS</Text>
                    <Text style={styles.price}>€25</Text>
                    <Text style={styles.pricePeriod}>per month</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
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
            <Text style={styles.emptyTitle}>No outlook has been published yet</Text>
            <Text style={styles.emptyBody}>
              The first publication will appear here after review and approval.
            </Text>
          </View>
        )}

        <View style={styles.archiveHeader}>
          <Text style={styles.archiveKicker}>HISTORICAL ARCHIVE</Text>
          <Text style={styles.archiveTitle}>Previous outlooks</Text>
          <Text style={styles.archiveDescription}>
            A new publication becomes the current outlook. Every earlier publication
            remains available with its original date, thesis and invalidation.
          </Text>
        </View>

        {outlooks.map((outlook, index) => {
          const isSelected = selected?.id === outlook.id;

          return (
            <Pressable
              accessibilityRole="button"
              key={outlook.id}
              onPress={() => setSelectedId(outlook.id)}
              style={({ pressed }) => [
                styles.archiveItem,
                isSelected && styles.archiveItemSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.archiveItemCopy}>
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
              </View>
              <Text style={styles.archiveArrow}>→</Text>
            </Pressable>
          );
        })}

        <Text style={styles.disclaimer}>
          Educational market commentary only. Not financial advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  pressed: {
    opacity: 0.72,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 18,
    backgroundColor: "#09090b",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    color: "#d4d4d8",
    fontWeight: "800",
  },
  hero: {
    marginBottom: 26,
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 999,
    backgroundColor: "#082f49",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.3,
  },
  liveBadge: {
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 999,
    backgroundColor: "#022c22",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  fallbackBadge: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 999,
    backgroundColor: "#451a03",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  feedBadgeText: {
    color: "#f4f4f5",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  heroTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "900",
  },
  heroDescription: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 27,
  },
  accessActiveBanner: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 20,
    backgroundColor: "#022c22",
    padding: 17,
  },
  accessPreviewBanner: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 20,
    backgroundColor: "#082f49",
    padding: 17,
  },
  accessActiveTitle: {
    color: "#6ee7b7",
    fontSize: 16,
    fontWeight: "900",
  },
  accessPreviewTitle: {
    color: "#7dd3fc",
    fontSize: 16,
    fontWeight: "900",
  },
  accessBody: {
    marginTop: 7,
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 22,
  },
  warningCard: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 20,
    backgroundColor: "#451a03",
    padding: 16,
  },
  warningTitle: {
    color: "#fde68a",
    fontSize: 15,
    fontWeight: "900",
  },
  warningBody: {
    marginTop: 7,
    color: "#fef3c7",
    fontSize: 13,
    lineHeight: 20,
  },
  loadingCard: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 28,
    backgroundColor: "#09090b",
    padding: 22,
  },
  loadingText: {
    marginTop: 14,
    color: "#a1a1aa",
    fontWeight: "800",
  },
  articleCard: {
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 30,
    backgroundColor: "#071018",
    padding: 22,
  },
  articleHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  articleHeaderCopy: {
    flex: 1,
    paddingRight: 14,
  },
  articleKicker: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  articleTitle: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
  },
  currentBadge: {
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 999,
    backgroundColor: "#022c22",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  archiveBadge: {
    borderWidth: 1,
    borderColor: "#71717a",
    borderRadius: 999,
    backgroundColor: "#18181b",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusBadgeText: {
    color: "#f4f4f5",
    fontSize: 10,
    fontWeight: "900",
  },
  metaRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 999,
    backgroundColor: "#18181b",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "800",
  },
  previewBlock: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#075985",
    borderRadius: 20,
    backgroundColor: "#082f49",
    padding: 18,
  },
  previewLabel: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  previewSentence: {
    marginTop: 11,
    color: "#f4f4f5",
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "600",
  },
  fullAnalysis: {
    marginTop: 18,
  },
  chartCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 14,
    overflow: "hidden",
  },
  chartLabel: {
    marginBottom: 12,
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  chartImage: {
    width: "100%",
    aspectRatio: 707 / 328,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  chartCaption: {
    marginTop: 12,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 17,
  },
  sectionNumber: {
    width: 36,
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "900",
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  sectionBody: {
    marginTop: 8,
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 25,
  },
  lockedCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#7c3aed",
    borderRadius: 24,
    backgroundColor: "#2e1065",
    padding: 19,
  },
  lockedKicker: {
    color: "#d8b4fe",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
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
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 23,
  },
  structureCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#4c1d95",
    borderRadius: 20,
    backgroundColor: "#1e1b4b",
    padding: 16,
  },
  structureTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  structureRow: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkmark: {
    marginRight: 10,
    color: "#6ee7b7",
    fontWeight: "900",
  },
  structureText: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 21,
  },
  structureNote: {
    marginTop: 16,
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 19,
  },
  priceRow: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderColor: "#6d28d9",
    borderRadius: 20,
    backgroundColor: "#1e1b4b",
    padding: 16,
  },
  priceLabel: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  price: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "900",
  },
  pricePeriod: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  unlockButton: {
    minWidth: 170,
    borderWidth: 1,
    borderColor: "#c084fc",
    borderRadius: 16,
    backgroundColor: "#7e22ce",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  unlockButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 26,
    backgroundColor: "#09090b",
    padding: 22,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },
  emptyBody: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  archiveHeader: {
    marginTop: 34,
    marginBottom: 14,
  },
  archiveKicker: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.4,
  },
  archiveTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  archiveDescription: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 23,
  },
  archiveItem: {
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 17,
  },
  archiveItemSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#082f49",
  },
  archiveItemCopy: {
    flex: 1,
    paddingRight: 12,
  },
  archiveItemState: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  archiveItemStateActive: {
    color: "#7dd3fc",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  archiveItemTitle: {
    marginTop: 7,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  archiveItemMeta: {
    marginTop: 6,
    color: "#a1a1aa",
    fontSize: 12,
  },
  archiveArrow: {
    color: "#7dd3fc",
    fontSize: 22,
    fontWeight: "900",
  },
  disclaimer: {
    marginTop: 22,
    color: "#52525b",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
});
