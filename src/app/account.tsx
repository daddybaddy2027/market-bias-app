import { router } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      {children}
    </View>
  );
}

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
    try {
      setRefreshing(true);
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
        .select("tier, generated_at, payload")
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
        .select("tier, generated_at, payload")
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
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="font-bold text-zinc-300">
          Loading account...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-3xl font-black text-white">
          No active session
        </Text>

        <Text className="mt-3 text-center text-sm leading-6 text-zinc-400">
          Sign in to test the Free and Pro access flow.
        </Text>

        <Pressable
          onPress={() =>
            router.replace(
              "/login" as never
            )
          }
          className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3"
        >
          <Text className="font-black text-emerald-300">
            Open login
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={
        Platform.OS === "web"
          ? ({
              height: "100vh",
            } as any)
          : undefined
      }
    >
      <ScrollView
        contentContainerClassName="px-5 pb-24 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#34d399"
          />
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
        >
          <Text className="font-bold text-zinc-300">
            ← Back
          </Text>
        </Pressable>

        <Text className="text-xs font-black uppercase tracking-[4px] text-emerald-400">
          Account
        </Text>

        <Text className="mt-4 text-4xl font-black text-white">
          {isPro
            ? "Pro access"
            : "Free access"}
        </Text>

        <Text className="mt-3 text-base text-zinc-400">
          {user?.email}
        </Text>

        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-black text-white">
              Current plan
            </Text>

            <View
              className={`rounded-full border px-3 py-1 ${
                isPro
                  ? "border-violet-500/40 bg-violet-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  isPro
                    ? "text-violet-300"
                    : "text-emerald-300"
                }`}
              >
                {isPro
                  ? "PRO"
                  : "FREE"}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-zinc-400">
            Database plan: {profile?.plan ?? "profile missing"}
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Subscription status: {profile?.subscription_status ?? "unknown"}
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Access expires: {profile?.subscription_expires_at ?? "not set"}
          </Text>
        </Card>

        <Pressable
          onPress={testRls}
          className="mt-5 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 py-4"
        >
          <Text className="text-center font-black text-sky-300">
            Test Supabase RLS access
          </Text>
        </Pressable>

        {testError ? (
          <View className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <Text className="text-sm text-red-300">
              {testError}
            </Text>
          </View>
        ) : null}

        {freePayload ? (
          <View className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <Text className="font-black text-emerald-300">
              FREE ROW VISIBLE
            </Text>

            <Text className="mt-2 text-sm leading-6 text-zinc-300">
              {JSON.stringify(
                freePayload.payload,
                null,
                2
              )}
            </Text>
          </View>
        ) : null}

        <View className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
          <Text className="font-black text-violet-300">
            {proPayload
              ? "PRO ROW VISIBLE"
              : "PRO ROW HIDDEN"}
          </Text>

          <Text className="mt-2 text-sm leading-6 text-zinc-300">
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
              "/" as never
            );
          }}
          className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4"
        >
          <Text className="text-center font-black text-red-300">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}