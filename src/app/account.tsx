import { router } from "expo-router";
import React, { useState } from "react";
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
    isPro,
    refreshProfile,
    signOut,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);

    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
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
            Sign in or create a Free account before subscribing to Pro.
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
        <Text style={styles.title}>{isPro ? "Pro access" : "Free access"}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Current plan</Text>
            <View style={[styles.planBadge, isPro ? styles.proBadge : styles.freeBadge]}>
              <Text style={[styles.planBadgeText, isPro ? styles.proText : styles.freeText]}>
                {isPro ? "PRO" : "FREE"}
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

        <View style={[styles.card, isPro ? styles.proInfoCard : styles.freeInfoCard]}>
          <Text style={styles.cardTitle}>{isPro ? "Pro is active" : "Free plan is active"}</Text>
          <Text style={styles.body}>
            {isPro
              ? "Your account can access the full Pro model board, current Pro signals and protected model pages."
              : "Free access includes the core market board. Upgrade to Pro to unlock current Pro-model direction, probability output and full model pages."}
          </Text>

          {!isPro ? (
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Open Pro subscription</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={refresh}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Refresh account status</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
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
    textTransform: "uppercase",
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
  card: {
    marginTop: 22,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#09090b",
    padding: 22,
  },
  freeInfoCard: {
    borderColor: "rgba(34, 197, 94, 0.35)",
    backgroundColor: "rgba(20, 83, 45, 0.20)",
  },
  proInfoCard: {
    borderColor: "rgba(168, 85, 247, 0.45)",
    backgroundColor: "rgba(88, 28, 135, 0.20)",
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
    borderColor: "rgba(52, 211, 153, 0.55)",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  proBadge: {
    borderColor: "rgba(192, 132, 252, 0.55)",
    backgroundColor: "rgba(168, 85, 247, 0.16)",
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  freeText: {
    color: "#6ee7b7",
  },
  proText: {
    color: "#d8b4fe",
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
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3f3f46",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#d4d4d8",
    textAlign: "center",
    fontWeight: "900",
  },
  signOutButton: {
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.55)",
    backgroundColor: "rgba(127, 29, 29, 0.35)",
    paddingVertical: 15,
  },
  signOutText: {
    color: "#fecaca",
    textAlign: "center",
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.7,
  },
});
