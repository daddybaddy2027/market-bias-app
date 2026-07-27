import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PayPalSubscribeButton } from "../components/PayPalSubscribeButton";
import { MODEL_CATALOG } from "../config/modelCatalog";
import { OUTLOOK_STRUCTURE } from "../config/outlookContent";
import { useAuth } from "../providers/AuthProvider";

type PlanTheme = "free" | "models" | "outlook" | "complete";

function FeatureRow({
  children,
  included = true,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <Text style={included ? styles.featureCheck : styles.featureMissing}>
        {included ? "✓" : "—"}
      </Text>
      <Text style={included ? styles.featureText : styles.featureTextMuted}>
        {children}
      </Text>
    </View>
  );
}

function Price({ value }: { value: string }) {
  return (
    <View style={styles.priceWrap}>
      <View style={styles.monthlyBadge}>
        <Text style={styles.monthlyBadgeText}>MONTHLY</Text>
      </View>
      <Text style={styles.priceValue}>{value}</Text>
      <Text style={styles.pricePeriod}>per month</Text>
    </View>
  );
}

function PlanCard({
  theme,
  title,
  subtitle,
  price,
  children,
  footer,
}: {
  theme: PlanTheme;
  title: string;
  subtitle: string;
  price: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <View style={[styles.planCard, planThemeStyles[theme]]}>
      <View style={styles.planHeader}>
        <View style={styles.planHeaderCopy}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
        </View>
        <Price value={price} />
      </View>

      <View style={styles.features}>{children}</View>
      {footer ? <View style={styles.planFooter}>{footer}</View> : null}
    </View>
  );
}

function PendingCheckoutButton({
  isAuthenticated,
  label,
}: {
  isAuthenticated: boolean;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push((isAuthenticated ? "/account" : "/login") as never)}
      style={({ pressed }) => [styles.pendingButton, pressed && styles.pressed]}
    >
      <Text style={styles.pendingButtonTitle}>
        {isAuthenticated ? label : "Create account before subscribing"}
      </Text>
      <Text style={styles.pendingButtonBody}>
        Checkout will be enabled after the matching PayPal plan and entitlement mapping
        are connected.
      </Text>
    </Pressable>
  );
}

export default function PricingScreen() {
  const {
    isAuthenticated,
    hasModelsAccess,
    hasOutlookAccess,
  } = useAuth();

  const freeModels = MODEL_CATALOG.filter((model) => model.tier === "Free");
  const proModels = MODEL_CATALOG.filter((model) => model.tier === "Pro");
  const hasCompleteAccess = hasModelsAccess && hasOutlookAccess;

  return (
    <SafeAreaView
      style={[
        styles.page,
        Platform.OS === "web" ? ({ height: "100vh" } as any) : null,
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>← Back to dashboard</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AI MARKET EXPERT PLANS</Text>
          <Text style={styles.heroTitle}>
            Models, analyst outlook, or the complete market view.
          </Text>
          <Text style={styles.heroBody}>
            Choose the probabilistic model board, the Technical and Fundamental
            Outlook, or combine both products under one subscription.
          </Text>
        </View>

        <PlanCard
          theme="free"
          title="Free"
          subtitle={`${freeModels.length} public model view plus core market context`}
          price="€0"
        >
          <FeatureRow>GBPUSD 12h Final V2 direction model</FeatureRow>
          <FeatureRow>Session-filtered public prediction schedule</FeatureRow>
          <FeatureRow>Core macro regime, market state and currency strength</FeatureRow>
          <FeatureRow>Two-sentence preview of the latest analyst outlook</FeatureRow>
          <FeatureRow>Locked previews of the remaining Pro models</FeatureRow>
          <FeatureRow included={false}>Complete model board and model history</FeatureRow>
          <FeatureRow included={false}>Full Outlook and historical archive</FeatureRow>
        </PlanCard>

        <PlanCard
          theme="models"
          title="Models"
          subtitle={`Full ${MODEL_CATALOG.length}-model board`}
          price="€24.99"
          footer={
            <>
              {isAuthenticated ? (
                <PayPalSubscribeButton />
              ) : (
                <Pressable
                  onPress={() => router.push("/login" as never)}
                  style={({ pressed }) => [styles.modelsLoginButton, pressed && styles.pressed]}
                >
                  <Text style={styles.modelsLoginButtonText}>
                    Create account before subscribing
                  </Text>
                </Pressable>
              )}

              {hasModelsAccess ? (
                <View style={styles.activeNotice}>
                  <Text style={styles.activeNoticeTitle}>Models access is active</Text>
                  <Text style={styles.activeNoticeBody}>
                    Your account can view the complete protected model board.
                  </Text>
                </View>
              ) : null}
            </>
          }
        >
          <FeatureRow>
            All {MODEL_CATALOG.length} model cards, including {proModels.length} Pro models
          </FeatureRow>
          <FeatureRow>Current bias, probability, confidence and forecast zones</FeatureRow>
          <FeatureRow>Verified live and evaluation metrics shown separately</FeatureRow>
          <FeatureRow>Independent non-overlapping history where available</FeatureRow>
          <FeatureRow>Range models with path coverage and outcome tracking</FeatureRow>
          <FeatureRow included={false}>Full Technical and Fundamental Outlook</FeatureRow>
        </PlanCard>

        <PlanCard
          theme="outlook"
          title="Technical and Fundamental Outlook"
          subtitle="Human macro, sentiment and technical commentary"
          price="€25"
          footer={
            hasOutlookAccess ? (
              <Pressable
                onPress={() => router.push("/outlook" as never)}
                style={({ pressed }) => [styles.outlookOpenButton, pressed && styles.pressed]}
              >
                <Text style={styles.outlookOpenButtonText}>Open your Outlook access</Text>
              </Pressable>
            ) : (
              <PendingCheckoutButton
                label="Outlook checkout is being connected"
                isAuthenticated={isAuthenticated}
              />
            )
          }
        >
          {OUTLOOK_STRUCTURE.slice(3).map((item) => (
            <FeatureRow key={item}>{item}</FeatureRow>
          ))}
          <FeatureRow>Two or three updates per week when conditions require them</FeatureRow>
          <FeatureRow>Every previous publication stored in the archive</FeatureRow>
          <FeatureRow included={false}>Complete protected model board</FeatureRow>
        </PlanCard>

        <PlanCard
          theme="complete"
          title="Complete"
          subtitle="Models plus Technical and Fundamental Outlook"
          price="€50"
          footer={
            hasCompleteAccess ? (
              <View style={styles.completeActiveNotice}>
                <Text style={styles.completeActiveTitle}>Complete access is active</Text>
                <Text style={styles.completeActiveBody}>
                  Models and Outlook entitlements are both enabled on this account.
                </Text>
              </View>
            ) : (
              <PendingCheckoutButton
                label="Complete checkout is being connected"
                isAuthenticated={isAuthenticated}
              />
            )
          }
        >
          <FeatureRow>Everything included in the Models package</FeatureRow>
          <FeatureRow>Everything included in the Outlook package</FeatureRow>
          <FeatureRow>Automated cross-asset view plus human interpretation</FeatureRow>
          <FeatureRow>Full model history and full Outlook archive</FeatureRow>
          <FeatureRow>One subscription for the complete platform</FeatureRow>
        </PlanCard>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Performance and commentary labels</Text>
          <Text style={styles.disclaimerBody}>
            Model accuracy comes from stored predictions and purged evaluation. Analyst
            outlooks are dated market commentary with a base case, alternatives and
            invalidation. Neither product guarantees future performance, because the
            market remains stubbornly indifferent to subscription architecture.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const planThemeStyles = StyleSheet.create({
  free: {
    borderColor: "#059669",
    backgroundColor: "#022c22",
  },
  models: {
    borderColor: "#8b5cf6",
    backgroundColor: "#2e1065",
  },
  outlook: {
    borderColor: "#0284c7",
    backgroundColor: "#082f49",
  },
  complete: {
    borderColor: "#d97706",
    backgroundColor: "#451a03",
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1060,
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
  eyebrow: {
    color: "#c4b5fd",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3.5,
  },
  heroTitle: {
    marginTop: 16,
    color: "#ffffff",
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "900",
  },
  heroBody: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 27,
  },
  planCard: {
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planHeaderCopy: {
    flex: 1,
    paddingRight: 16,
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
  },
  planSubtitle: {
    marginTop: 7,
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 22,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  monthlyBadge: {
    borderWidth: 1,
    borderColor: "#a78bfa",
    borderRadius: 999,
    backgroundColor: "#312e81",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  monthlyBadgeText: {
    color: "#ede9fe",
    fontSize: 9,
    fontWeight: "900",
  },
  priceValue: {
    marginTop: 9,
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "900",
  },
  pricePeriod: {
    marginTop: 3,
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "700",
  },
  features: {
    marginTop: 13,
  },
  featureRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureCheck: {
    marginRight: 10,
    color: "#6ee7b7",
    fontSize: 15,
    fontWeight: "900",
  },
  featureMissing: {
    marginRight: 10,
    color: "#71717a",
    fontSize: 15,
    fontWeight: "900",
  },
  featureText: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 22,
  },
  featureTextMuted: {
    flex: 1,
    color: "#71717a",
    fontSize: 14,
    lineHeight: 22,
  },
  planFooter: {
    marginTop: 18,
  },
  modelsLoginButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 18,
    backgroundColor: "#6d28d9",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modelsLoginButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
  },
  pendingButton: {
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#71717a",
    borderRadius: 18,
    backgroundColor: "#18181b",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  pendingButtonTitle: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  pendingButtonBody: {
    marginTop: 6,
    color: "#a1a1aa",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  outlookOpenButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7dd3fc",
    borderRadius: 18,
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  outlookOpenButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
  },
  activeNotice: {
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 17,
    backgroundColor: "#022c22",
    padding: 14,
  },
  activeNoticeTitle: {
    color: "#6ee7b7",
    fontWeight: "900",
  },
  activeNoticeBody: {
    marginTop: 5,
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
  },
  completeActiveNotice: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 17,
    backgroundColor: "#78350f",
    padding: 14,
  },
  completeActiveTitle: {
    color: "#fde68a",
    fontWeight: "900",
  },
  completeActiveBody: {
    marginTop: 5,
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 18,
  },
  disclaimerCard: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 24,
    backgroundColor: "#09090b",
    padding: 20,
  },
  disclaimerTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
  },
  disclaimerBody: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 23,
  },
});
