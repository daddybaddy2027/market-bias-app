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

import { supabase } from "../lib/supabase";
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

  const [refreshing, setRefreshing] =
    useState(false);

  const [freePayload, setFreePayload] =
    useState<any>(null);

  const [proPayload, setProPayload] =
    useState<any>(null);

  const [testError, setTestError] =
    useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);

    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }

  async function testRls() {
    setTestError(null);
    setFreePayload(null);
    setProPayload(null);

    const freeResult =
      await supabase
        .from("market_state_latest")
        .select(
          "tier, generated_at, payload"
        )
        .eq("tier", "free")
        .maybeSingle();

    if (freeResult.error) {
      setTestError(
        `Free query failed: ${freeResult.error.message}`
      );

      return;
    }

    setFreePayload(
      freeResult.data
    );

    const proResult =
      await supabase
        .from("market_state_latest")
        .select(
          "tier, generated_at, payload"
        )
        .eq("tier", "pro")
        .maybeSingle();

    if (proResult.error) {
      setTestError(
        `Pro query failed: ${proResult.error.message}`
      );

      return;
    }

    setProPayload(
      proResult.data
    );
  }

  if (
    initializing ||
    profileLoading
  ) {
    return (
      <SafeAreaView
        style={styles.loadingPage}
      >
        <ActivityIndicator
          size="large"
          color="#6ee7b7"
        />

        <Text
          style={styles.loadingText}
        >
          Loading account...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={styles.page}
      >
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.title}
          >
            No active session
          </Text>

          <Text
            style={styles.body}
          >
            Sign in to test Free and Pro access.
          </Text>

          <Pressable
            onPress={() =>
              router.replace(
                "/login" as never
              )
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Open login
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6ee7b7"
          />
        }
      >
        <Pressable
          onPress={() =>
            router.replace(
              "/" as never
            )
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={styles.backText}
          >
            ← Back to dashboard
          </Text>
        </Pressable>

        <Text
          style={styles.eyebrow}
        >
          ACCOUNT
        </Text>

        <Text
          style={styles.title}
        >
          {isPro
            ? "Pro access"
            : "Free access"}
        </Text>

        <Text
          style={styles.email}
        >
          {user?.email}
        </Text>

        <View
          style={styles.card}
        >
          <View
            style={styles.row}
          >
            <Text
              style={styles.cardTitle}
            >
              Current plan
            </Text>

            <View
              style={[
                styles.planBadge,
                isPro
                  ? styles.proBadge
                  : styles.freeBadge,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  isPro
                    ? styles.proText
                    : styles.freeText,
                ]}
              >
                {isPro
                  ? "PRO"
                  : "FREE"}
              </Text>
            </View>
          </View>

          <Text
            style={styles.meta}
          >
            Database plan:{" "}
            {profile?.plan ??
              "profile missing"}
          </Text>

          <Text
            style={styles.meta}
          >
            Subscription status:{" "}
            {profile
              ?.subscription_status ??
              "unknown"}
          </Text>

          <Text
            style={styles.meta}
          >
            Access expires:{" "}
            {profile
              ?.subscription_expires_at ??
              "not set"}
          </Text>
        </View>

        <Pressable
          onPress={testRls}
          style={({ pressed }) => [
            styles.testButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={styles.testButtonText}
          >
            Test Supabase RLS access
          </Text>
        </Pressable>

        {testError ? (
          <View
            style={[
              styles.resultCard,
              styles.errorResult,
            ]}
          >
            <Text
              style={styles.resultText}
            >
              {testError}
            </Text>
          </View>
        ) : null}

        {freePayload ? (
          <View
            style={[
              styles.resultCard,
              styles.freeResult,
            ]}
          >
            <Text
              style={styles.freeResultTitle}
            >
              FREE ROW VISIBLE
            </Text>

            <Text
              style={styles.resultText}
            >
              {JSON.stringify(
                freePayload.payload,
                null,
                2
              )}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.resultCard,
            styles.proResult,
          ]}
        >
          <Text
            style={styles.proResultTitle}
          >
            {proPayload
              ? "PRO ROW VISIBLE"
              : "PRO ROW HIDDEN"}
          </Text>

          <Text
            style={styles.resultText}
          >
            {proPayload
              ? JSON.stringify(
                  proPayload.payload,
                  null,
                  2
                )
              : "Correct for a Free account. An active Pro account should receive this row."}
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await signOut();

            router.replace(
              "/login" as never
            );
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={styles.signOutText}
          >
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
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
      marginTop: 14,
      color: "#d4d4d8",
      fontSize: 15,
      fontWeight: "700",
    },

    scrollContent: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 80,
    },

    emptyCard: {
      width: "90%",
      maxWidth: 560,
      alignSelf: "center",
      marginTop: 90,
      borderWidth: 1,
      borderColor: "#27272a",
      borderRadius: 28,
      backgroundColor: "#09090b",
      padding: 24,
    },

    backButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: "#27272a",
      borderRadius: 16,
      backgroundColor: "#09090b",
      paddingHorizontal: 16,
      paddingVertical: 13,
      marginBottom: 28,
    },

    backText: {
      color: "#d4d4d8",
      fontSize: 15,
      fontWeight: "800",
    },

    eyebrow: {
      color: "#34d399",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 4,
    },

    title: {
      marginTop: 14,
      color: "#ffffff",
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "900",
    },

    body: {
      marginTop: 12,
      color: "#a1a1aa",
      fontSize: 16,
      lineHeight: 25,
    },

    email: {
      marginTop: 12,
      marginBottom: 24,
      color: "#a1a1aa",
      fontSize: 16,
    },

    card: {
      borderWidth: 1,
      borderColor: "#27272a",
      borderRadius: 24,
      backgroundColor: "#09090b",
      padding: 20,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    cardTitle: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "900",
    },

    planBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    freeBadge: {
      borderColor: "#047857",
      backgroundColor: "#022c22",
    },

    proBadge: {
      borderColor: "#7c3aed",
      backgroundColor: "#2e1065",
    },

    planBadgeText: {
      fontSize: 12,
      fontWeight: "900",
    },

    freeText: {
      color: "#6ee7b7",
    },

    proText: {
      color: "#ddd6fe",
    },

    meta: {
      marginTop: 14,
      color: "#a1a1aa",
      fontSize: 15,
      lineHeight: 23,
    },

    primaryButton: {
      minHeight: 54,
      marginTop: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#047857",
      borderRadius: 16,
      backgroundColor: "#052e2b",
      paddingHorizontal: 18,
      paddingVertical: 15,
    },

    primaryButtonText: {
      color: "#6ee7b7",
      fontSize: 16,
      fontWeight: "900",
    },

    testButton: {
      minHeight: 54,
      marginTop: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#0369a1",
      borderRadius: 16,
      backgroundColor: "#082f49",
      paddingHorizontal: 18,
      paddingVertical: 15,
    },

    testButtonText: {
      color: "#7dd3fc",
      fontSize: 16,
      fontWeight: "900",
    },

    resultCard: {
      marginTop: 16,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
    },

    freeResult: {
      borderColor: "#047857",
      backgroundColor: "#022c22",
    },

    proResult: {
      borderColor: "#7c3aed",
      backgroundColor: "#2e1065",
    },

    errorResult: {
      borderColor: "#b91c1c",
      backgroundColor: "#450a0a",
    },

    freeResultTitle: {
      color: "#6ee7b7",
      fontSize: 15,
      fontWeight: "900",
    },

    proResultTitle: {
      color: "#ddd6fe",
      fontSize: 15,
      fontWeight: "900",
    },

    resultText: {
      marginTop: 10,
      color: "#e4e4e7",
      fontSize: 14,
      lineHeight: 21,
    },

    signOutButton: {
      minHeight: 54,
      marginTop: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#b91c1c",
      borderRadius: 16,
      backgroundColor: "#450a0a",
      paddingHorizontal: 18,
      paddingVertical: 15,
    },

    signOutText: {
      color: "#fca5a5",
      fontSize: 16,
      fontWeight: "900",
    },

    pressed: {
      opacity: 0.72,
    },
  });