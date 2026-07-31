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

import { AppTopNav } from "../components/AppTopNav";
import {
  PayPalSubscribeButton,
  type PayPalProduct,
} from "../components/PayPalSubscribeButton";
import { MODEL_CATALOG } from "../config/modelCatalog";
import { useAuth } from "../providers/AuthProvider";

type PlanTheme = "free" | "models" | "outlook" | "complete";

type PlanProps = {
  theme: PlanTheme;
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  product?: PayPalProduct;
  recommended?: boolean;
  active?: boolean;
};

const THEME = {
  free: { border: "#064e3b", background: "#061713", accent: "#6ee7b7" },
  models: { border: "#4c1d95", background: "#120b20", accent: "#c4b5fd" },
  outlook: { border: "#0c4a6e", background: "#071820", accent: "#7dd3fc" },
  complete: { border: "#92400e", background: "#1c1207", accent: "#fbbf24" },
};

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{children}</Text>
    </View>
  );
}

function PlanCard({
  theme,
  title,
  price,
  subtitle,
  features,
  product,
  recommended,
  active,
}: PlanProps) {
  const palette = THEME[theme];

  return (
    <View
      style={[
        styles.planCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
      ]}
    >
      <View style={styles.planTopRow}>
        <View style={styles.planTitleWrap}>
          <View style={styles.planBadges}>
            <View style={[styles.planTypeBadge, { borderColor: palette.border }]}>
              <Text style={[styles.planTypeText, { color: palette.accent }]}>
                {title.toUpperCase()}
              </Text>
            </View>
            {recommended ? (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>BEST VALUE</Text>
              </View>
            ) : null}
            {active ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.priceWrap}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.pricePeriod}>{price === "€0" ? "forever" : "per month"}</Text>
        </View>
      </View>

      <View style={styles.featureList}>
        {features.map((feature) => (
          <FeatureRow key={feature}>{feature}</FeatureRow>
        ))}
      </View>

      <View style={styles.planAction}>
        {product ? (
          <PayPalSubscribeButton product={product} />
        ) : (
          <Pressable
            onPress={() => router.push("/" as never)}
            style={({ pressed }) => [styles.freeButton, pressed && styles.pressed]}
          >
            <Text style={styles.freeButtonText}>Open free dashboard</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function PricingScreen() {
  const {
    isAuthenticated,
    hasModelsAccess,
    hasOutlookAccess,
  } = useAuth();
  const hasCompleteAccess = hasModelsAccess && hasOutlookAccess;

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
          <Text style={styles.eyebrow}>SIMPLE MONTHLY ACCESS</Text>
          <Text style={styles.heroTitle}>Choose the layer of market context you need.</Text>
          <Text style={styles.heroBody}>
            Start with the free cross-asset dashboard, add six transparent AI model products,
            subscribe to the analyst Outlook, or combine both under Complete access.
          </Text>

          {!isAuthenticated ? (
            <Pressable
              onPress={() => router.push("/login" as never)}
              style={({ pressed }) => [styles.createAccountButton, pressed && styles.pressed]}
            >
              <Text style={styles.createAccountButtonText}>Create a free account first</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.assuranceStrip}>
          <View style={styles.assuranceItem}>
            <Text style={styles.assuranceValue}>PayPal</Text>
            <Text style={styles.assuranceLabel}>Secure recurring checkout</Text>
          </View>
          <View style={styles.assuranceItem}>
            <Text style={styles.assuranceValue}>Webhook verified</Text>
            <Text style={styles.assuranceLabel}>Browser approval cannot unlock access alone</Text>
          </View>
          <View style={styles.assuranceItem}>
            <Text style={styles.assuranceValue}>Cancel anytime</Text>
            <Text style={styles.assuranceLabel}>Access follows verified subscription status</Text>
          </View>
        </View>

        <View style={styles.planGrid}>
          <PlanCard
            theme="free"
            title="Free"
            price="€0"
            subtitle="The market context layer before any subscription."
            features={[
              "Live market regime and risk-on / risk-off context",
              "Currency-strength ranking and cross-asset drivers",
              "One public GBPUSD 12h model product",
              "Two-sentence preview of the latest Outlook",
              "Locked previews of Pro research and model analytics",
            ]}
          />

          <PlanCard
            theme="models"
            title="Models"
            price="€24.99"
            subtitle={`All ${MODEL_CATALOG.length} selected production model products.`}
            product="models"
            active={hasModelsAccess && !hasCompleteAccess}
            features={[
              "Six selected model products across EURUSD, GBPUSD, AUDUSD and USDJPY",
              "Directional bias, confidence and momentum confirmations",
              "Correct, incorrect and pending prediction ledger",
              "Live signed-pip and trade-management tracking",
              "MFE, MAE, half-profit and break-even outcomes where available",
              "Full protected model history and performance filters",
            ]}
          />

          <PlanCard
            theme="outlook"
            title="Outlook"
            price="€25"
            subtitle="Trader-led fundamental, macro and technical analysis."
            product="outlook"
            active={hasOutlookAccess && !hasCompleteAccess}
            features={[
              "Weekly market regime and major currency outlook",
              "Monetary policy, sentiment, geopolitics and capital-flow context",
              "Important events and post-event market updates",
              "Pair of interest with technical structure",
              "Base scenario, alternative scenario and invalidation",
              "Complete historical archive with macro and technical charts",
            ]}
          />

          <PlanCard
            theme="complete"
            title="Complete"
            price="€50"
            subtitle="The full systematic and human market view in one account."
            product="complete"
            recommended
            active={hasCompleteAccess}
            features={[
              "Everything included in Models access",
              "Everything included in Outlook access",
              "Full prediction performance dashboard",
              "Full analyst archive and technical charts",
              "One recurring subscription and one account entitlement",
              "Best fit for traders combining their own setup with directional confirmation",
            ]}
          />
        </View>

        <View style={styles.explanationCard}>
          <Text style={styles.explanationKicker}>WHAT YOU ARE PAYING FOR</Text>
          <Text style={styles.explanationTitle}>Decision support, not manufactured certainty.</Text>
          <Text style={styles.explanationBody}>
            Models preserve every published prediction and separate terminal forecast accuracy
            from trade-management outcomes. Outlook publications remain dated, archived and
            attached to their original scenario and invalidation. No package guarantees profit.
          </Text>
        </View>

        <View style={styles.faqGrid}>
          <View style={styles.faqCard}>
            <Text style={styles.faqTitle}>When does access unlock?</Text>
            <Text style={styles.faqBody}>
              After PayPal approves the subscription and the server verifies the signed webhook.
              This normally takes seconds, though payment reviews can take longer.
            </Text>
          </View>
          <View style={styles.faqCard}>
            <Text style={styles.faqTitle}>Can I use the models as signals?</Text>
            <Text style={styles.faqBody}>
              You can use them as directional confirmation or as a systematic signal source,
              but position sizing and execution remain your responsibility.
            </Text>
          </View>
          <View style={styles.faqCard}>
            <Text style={styles.faqTitle}>Are losses removed?</Text>
            <Text style={styles.faqBody}>
              No. Correct, incorrect and pending predictions remain in the stored ledger.
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Educational market analysis and model research only. Not financial advice.
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
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  pressed: {
    opacity: 0.7,
  },
  hero: {
    marginBottom: 25,
    maxWidth: 850,
  },
  eyebrow: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.6,
  },
  heroTitle: {
    marginTop: 15,
    color: "#ffffff",
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  heroBody: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 27,
  },
  createAccountButton: {
    alignSelf: "flex-start",
    minHeight: 50,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
    borderRadius: 16,
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
  },
  createAccountButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  assuranceStrip: {
    marginBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 22,
    backgroundColor: "#09090b",
    padding: 12,
  },
  assuranceItem: {
    flexGrow: 1,
    flexBasis: 220,
    padding: 10,
  },
  assuranceValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  assuranceLabel: {
    marginTop: 5,
    color: "#71717a",
    fontSize: 11,
    lineHeight: 17,
  },
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  planCard: {
    flexGrow: 1,
    flexBasis: 500,
    borderWidth: 1,
    borderRadius: 26,
    padding: 21,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
  },
  planTitleWrap: {
    flex: 1,
  },
  planBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  planTypeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planTypeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  recommendedBadge: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 999,
    backgroundColor: "#451a03",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recommendedText: {
    color: "#fde68a",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  activeBadge: {
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 999,
    backgroundColor: "#022c22",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeText: {
    color: "#6ee7b7",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  planTitle: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
  },
  planSubtitle: {
    marginTop: 7,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  price: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "900",
  },
  pricePeriod: {
    marginTop: 4,
    color: "#71717a",
    fontSize: 10,
    fontWeight: "800",
  },
  featureList: {
    marginTop: 16,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureCheck: {
    marginRight: 10,
    color: "#6ee7b7",
    fontWeight: "900",
  },
  featureText: {
    flex: 1,
    color: "#e4e4e7",
    fontSize: 13,
    lineHeight: 21,
  },
  planAction: {
    marginTop: 20,
  },
  freeButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 17,
    backgroundColor: "#047857",
  },
  freeButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  explanationCard: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#0c4a6e",
    borderRadius: 25,
    backgroundColor: "#071820",
    padding: 21,
  },
  explanationKicker: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  explanationTitle: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  explanationBody: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 23,
  },
  faqGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  faqCard: {
    flexGrow: 1,
    flexBasis: 300,
    borderWidth: 1,
    borderColor: "#202026",
    borderRadius: 21,
    backgroundColor: "#0c0c0e",
    padding: 17,
  },
  faqTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  faqBody: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 24,
    color: "#52525b",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
});
