import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  FREE_MODEL_KEYS,
  PRO_MODEL_KEYS,
} from "../config/access";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}
    >
      {children}
    </View>
  );
}

function FeatureRow({
  children,
  included = true,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <View className="mt-3 flex-row items-start">
      <Text
        className={`mr-3 text-base font-black ${
          included
            ? "text-emerald-300"
            : "text-zinc-600"
        }`}
      >
        {included ? "✓" : "—"}
      </Text>

      <Text
        className={`flex-1 text-sm leading-6 ${
          included
            ? "text-zinc-300"
            : "text-zinc-600"
        }`}
      >
        {children}
      </Text>
    </View>
  );
}

export default function PricingScreen() {
  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={
        Platform.OS === "web"
          ? ({ height: "100vh" } as any)
          : undefined
      }
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24 pt-4"
      >
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 active:opacity-70"
        >
          <Text className="font-bold text-zinc-300">
            ← Back to dashboard
          </Text>
        </Pressable>

        <View className="mb-7">
          <Text className="text-xs font-black uppercase tracking-[4px] text-violet-300">
            Plans
          </Text>

          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Choose how much of the market picture you need
          </Text>

          <Text className="mt-4 text-base leading-7 text-zinc-400">
            The Free plan keeps the core dashboard useful.
            Pro unlocks the complete model set, deeper
            cross-asset interpretation and full verified history.
          </Text>
        </View>

        <Card className="mb-5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-2xl font-black text-white">
                Free
              </Text>

              <Text className="mt-1 text-sm text-zinc-500">
                Core market intelligence
              </Text>
            </View>

            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
              <Text className="text-xs font-black text-emerald-300">
                €0
              </Text>
            </View>
          </View>

          <Text className="mt-5 text-3xl font-black text-white">
            2 live models
          </Text>

          <Text className="mt-1 text-sm text-zinc-500">
            {Array.from(FREE_MODEL_KEYS).join(" · ")}
          </Text>

          <FeatureRow>
            Complete currency-strength ranking
          </FeatureRow>

          <FeatureRow>
            Equities, volatility, USD and JPY-haven drivers
          </FeatureRow>

          <FeatureRow>
            Active regime and composite risk score
          </FeatureRow>

          <FeatureRow>
            Selected prediction details and chart
          </FeatureRow>

          <FeatureRow included={false}>
            Complete model set
          </FeatureRow>

          <FeatureRow included={false}>
            Full rates, metals and risk-appetite interpretation
          </FeatureRow>

          <FeatureRow included={false}>
            Complete verified prediction history
          </FeatureRow>
        </Card>

        <Card className="mb-5 border-violet-500/40 bg-violet-500/10">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-2xl font-black text-white">
                Pro Beta
              </Text>

              <Text className="mt-1 text-sm text-violet-200">
                Complete market-intelligence layer
              </Text>
            </View>

            <View className="rounded-full border border-violet-400/50 bg-violet-500/20 px-3 py-1">
              <Text className="text-xs font-black text-violet-200">
                PLANNED
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-end">
            <Text className="text-4xl font-black text-white">
              €9.99
            </Text>

            <Text className="mb-1 ml-2 text-sm text-zinc-400">
              / month
            </Text>
          </View>

          <Text className="mt-2 text-sm text-zinc-400">
            Beta price. Cancel anytime after subscriptions launch.
          </Text>

          <FeatureRow>
            All Free features
          </FeatureRow>

          <FeatureRow>
            Full public model set, currently including{" "}
            {Array.from(PRO_MODEL_KEYS).join(" · ")}
          </FeatureRow>

          <FeatureRow>
            Yields / rates, metals and detailed risk-appetite drivers
          </FeatureRow>

          <FeatureRow>
            Full projected zones and verified prediction history
          </FeatureRow>

          <FeatureRow>
            Accuracy by asset, horizon and confidence sample
          </FeatureRow>

          <FeatureRow>
            Future Market Clarity, Cross-Asset Agreement and
            Breakout Pressure tools
          </FeatureRow>

          <View className="mt-6 rounded-2xl border border-violet-400/40 bg-black/30 p-4">
            <Text className="text-base font-black text-violet-200">
              Login and payments are coming in Phase 2
            </Text>

            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              No payment is collected yet. The current Pro lock is
              a public-beta preview while authentication and secure
              backend access are being built.
            </Text>
          </View>

          <Pressable
            disabled
            className="mt-5 rounded-2xl border border-violet-500/40 bg-violet-500/15 px-5 py-4 opacity-80"
          >
            <Text className="text-center font-black text-violet-200">
              Pro subscriptions coming soon
            </Text>
          </Pressable>
        </Card>

        <Card>
          <Text className="text-xl font-black text-white">
            Why a subscription?
          </Text>

          <Text className="mt-3 text-sm leading-6 text-zinc-400">
            The platform continuously downloads data, calculates
            thousands of cross-asset features, runs several
            probabilistic models and verifies forecasts against
            later market prices. Pro supports continued data,
            infrastructure and model development rather than
            selling a magical certainty machine, because those
            mostly belong in advertisements and court exhibits.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
