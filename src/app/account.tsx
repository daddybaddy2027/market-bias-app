import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../providers/AuthProvider";

export default function AccountScreen() {
  const {
    initializing,
    profileLoading,
    user,
    profile,
    isAuthenticated,
    hasModelsAccess,
    hasOutlookAccess,
    refreshProfile,
    signOut,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const packageName = useMemo(() => {
    if (hasModelsAccess && hasOutlookAccess) return "Complete access";
    if (hasModelsAccess) return "Models access";
    if (hasOutlookAccess) return "Outlook access";
    return "Free access";
  }, [hasModelsAccess, hasOutlookAccess]);

  async function refresh() {
    setRefreshing(true);
    setActionError(null);

    try {
      await refreshProfile();
    } catch (error: any) {
      setActionError(error?.message ?? "Account refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setActionError(null);

    try {
      await signOut();
      router.replace("/" as never);
    } catch (error: any) {
      setActionError(error?.message ?? "Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  }

  if (initializing || profileLoading) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#6ee7b7" />
        <Text style={styles.loadingText}>Loading account...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.emptyCard}>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>No active session</Text>
          <Text style={styles.body}>
            Sign in or create a Free account before activating Models or Outlook access.
          </Text>

          <Pressable
            onPress={() => router.replace("/login" as never)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Open login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6ee7b7" />
        }
      >
        <Pressable
          onPress={() => router.replace("/" as never)}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>← Back to dashboard</Text>
        </Pressable>

        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>{packageName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {!profile ? (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.warningTitle}>Profile row is missing</Text>
            <Text style={styles.body}>
              Authentication is active, but the application profile could not be loaded.
              Subscription access cannot be verified until the profile row exists.
            </Text>
          </View>
        ) : null}

        <View style={styles.entitlementGrid}>
          <View style={[styles.entitlementCard, hasModelsAccess ? styles.activeCard : styles.lockedCard]}>
            <Text style={styles.entitlementLabel}>MODELS</Text>
            <Text style={styles.entitlementTitle}>
              {hasModelsAccess ? "Active" : "Locked"}
            </Text>
            <Text style={styles.entitlementBody}>
              {hasModelsAccess
                ? "Full protected model board, current signals, model detail pages and available history."
                : "Free users retain the public model and locked previews of the remaining models."}
            </Text>
          </View>

          <View style={[styles.entitlementCard, hasOutlookAccess ? styles.outlookActiveCard : styles.lockedCard]}>
            <Text style={styles.outlookLabel}>OUTLOOK</Text>
            <Text style={styles.entitlementTitle}>
              {hasOutlookAccess ? "Active" : "Locked"}
            </Text>
            <Text style={styles.entitlementBody}>
              {hasOutlookAccess
                ? "Full Technical and Fundamental Outlook, event updates and historical archive."
                : "The first two preview sentences remain public; complete analysis requires Outlook access."}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Subscription record</Text>
            <View style={[styles.planBadge, hasModelsAccess || hasOutlookAccess ? styles.proBadge : styles.freeBadge]}>
              <Text style={[styles.planBadgeText, hasModelsAccess || hasOutlookAccess ? styles.proText : styles.freeText]}>
                {hasModelsAccess && hasOutlookAccess
                  ? "COMPLETE"
                  : hasModelsAccess
                    ? "MODELS"
                    : hasOutlookAccess
                      ? "OUTLOOK"
                      : "FREE"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta}>Database plan: {profile?.plan ?? "profile missing"}</Text>
          <Text style={styles.meta}>
            Subscription status: {profile?.subscription_status ?? "unknown"}
          </Text>
          <Text style={styles.meta}>
            Provider: {profile?.subscription_provider ?? "not connected"}
          </Text>
          <Text style={styles.meta}>
            Access expires: {profile?.subscription_expires_at ?? "not set"}
          </Text>
        </View>

        {actionError ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <View style={styles.actionGrid}>
          <Pressable
            onPress={() => router.replace("/" as never)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Open model board</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/outlook" as never)}
            style={({ pressed }) => [styles.outlookButton, pressed && styles.pressed]}
          >
            <Text style={styles.outlookButtonText}>Open Outlook</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/pricing" as never)}
            style={({ pressed }) => [styles.pricingButton, pressed && styles.pressed]}
          >
            <Text style={styles.pricingButtonText}>View plans</Text>
          </Pressable>

          <Pressable
            disabled={refreshing}
            onPress={refresh}
            style={({ pressed }) => [
              styles.refreshButton,
              refreshing && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? "Refreshing..." : "Refresh account status"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={signingOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            signingOut && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color="#fecaca" />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    marginTop: 12,
    color: "#a1a1aa",
    fontWeight: "700",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 64,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#09090b",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    color: "#d4d4d8",
    fontWeight: "800",
  },
  eyebrow: {
    color: "#6ee7b7",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4,
  },
  title: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "900",
  },
  email: {
    marginTop: 10,
    color: "#d4d4d8",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyCard: {
    margin: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#09090b",
    padding: 22,
  },
  entitlementGrid: {
    marginTop: 22,
    gap: 14,
  },
  entitlementCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  activeCard: {
    borderColor: "#8b5cf6",
    backgroundColor: "#2e1065",
  },
  outlookActiveCard: {
    borderColor: "#38bdf8",
    backgroundColor: "#082f49",
  },
  lockedCard: {
    borderColor: "#3f3f46",
    backgroundColor: "#09090b",
  },
  entitlementLabel: {
    color: "#c4b5fd",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  outlookLabel: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  entitlementTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  entitlementBody: {
    marginTop: 10,
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    marginTop: 22,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#09090b",
    padding: 22,
  },
  warningCard: {
    borderColor: "#d97706",
    backgroundColor: "#451a03",
  },
  warningTitle: {
    color: "#fde68a",
    fontSize: 18,
    fontWeight: "900",
  },
  errorCard: {
    borderColor: "#dc2626",
    backgroundColor: "#450a0a",
  },
  errorText: {
    color: "#fecaca",
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  freeBadge: {
    borderColor: "#34d399",
    backgroundColor: "#064e3b",
  },
  proBadge: {
    borderColor: "#c084fc",
    backgroundColor: "#3b0764",
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  freeText: {
    color: "#6ee7b7",
  },
  proText: {
    color: "#e9d5ff",
  },
  meta: {
    marginTop: 12,
    color: "#d4d4d8",
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    marginTop: 14,
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  actionGrid: {
    marginTop: 22,
    gap: 12,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#10b981",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#001510",
    textAlign: "center",
    fontWeight: "900",
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    backgroundColor: "#2e1065",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#ede9fe",
    textAlign: "center",
    fontWeight: "900",
  },
  outlookButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#38bdf8",
    backgroundColor: "#075985",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  outlookButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
  },
  pricingButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d97706",
    backgroundColor: "#451a03",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  pricingButtonText: {
    color: "#fde68a",
    textAlign: "center",
    fontWeight: "900",
  },
  refreshButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3f3f46",
    backgroundColor: "#18181b",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  refreshButtonText: {
    color: "#d4d4d8",
    textAlign: "center",
    fontWeight: "900",
  },
  signOutButton: {
    minHeight: 54,
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f87171",
    backgroundColor: "#450a0a",
    paddingVertical: 15,
  },
  signOutText: {
    color: "#fecaca",
    textAlign: "center",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});