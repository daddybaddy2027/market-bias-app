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

import { PayPalSubscribeButton } from "../components/PayPalSubscribeButton";
import { useAuth } from "../providers/AuthProvider";
import { MODEL_CATALOG } from "../config/modelCatalog";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-3xl border border-zinc-800 bg-zinc-950 p-5 ${className}`}>
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
          included ? "text-emerald-300" : "text-zinc-600"
        }`}
      >
        {included ? "✓" : "—"}
      </Text>
      <Text
        className={`flex-1 text-sm leading-6 ${
          included ? "text-zinc-300" : "text-zinc-600"
        }`}
      >
        {children}
      </Text>
    </View>
  );
}

export default function PricingScreen() {
  const { isAuthenticated, isPro } = useAuth();
  const freeModels = MODEL_CATALOG.filter((model) => model.tier === "Free");
  const proModels = MODEL_CATALOG.filter((model) => model.tier === "Pro");

  return (
    <SafeAreaView
      className="flex-1 bg-black"
      style={Platform.OS === "web" ? ({ height: "100vh" } as any) : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 active:opacity-70"
        >
          <Text className="font-bold text-zinc-300">← Back to dashboard</Text>
        </Pressable>

        <View className="mb-7">
          <Text className="text-xs font-black uppercase tracking-[4px] text-violet-300">
            AI MARKET EXPERT PRO
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Thirteen models. Three Free. Ten Pro.
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Free includes the verified EURUSD 3h production model, GBPUSD 12h Final V2
            and EURUSD 12h Final V2. Pro unlocks every other current prediction,
            probability, forecast zone and exact model history.
          </Text>
        </View>

        <Card className="mb-5 border-emerald-500/30 bg-emerald-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">Free</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                {freeModels.length} live model views plus core market context
              </Text>
            </View>
            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
              <Text className="text-xs font-black text-emerald-300">€0</Text>
            </View>
          </View>

          <FeatureRow>EURUSD 3h verified production direction model</FeatureRow>
          <FeatureRow>GBPUSD 12h Final V2 direction model</FeatureRow>
          <FeatureRow>EURUSD 12h Final V2 direction model under live threshold validation</FeatureRow>
          <FeatureRow>Core macro regime, market state and currency strength</FeatureRow>
          <FeatureRow>Public evaluation and verified-history statistics</FeatureRow>
          <FeatureRow>Locked preview of all ten Pro models</FeatureRow>
          <FeatureRow included={false}>Current Pro bias, probability and forecast zones</FeatureRow>
          <FeatureRow included={false}>Full Pro prediction history and independent-sample filter</FeatureRow>
        </Card>

        <Card className="mb-5 border-violet-500/40 bg-violet-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">Pro</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                Full {MODEL_CATALOG.length}-model board
              </Text>
            </View>
            <View className="items-end">
              <View className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1">
                <Text className="text-xs font-black text-violet-200">MONTHLY</Text>
              </View>
              <Text className="mt-3 text-3xl font-black text-white">€24.99</Text>
              <Text className="mt-1 text-xs font-bold text-zinc-400">per month</Text>
            </View>
          </View>

          <FeatureRow>All {MODEL_CATALOG.length} model cards, including {proModels.length} Pro models</FeatureRow>
          <FeatureRow>Current bias, probability, confidence and forecast zones</FeatureRow>
          <FeatureRow>Seven new V3 cross-asset models with clearly labelled evaluation metrics</FeatureRow>
          <FeatureRow>Verified live history for EURUSD 3h and EURUSD 12h Final V2</FeatureRow>
          <FeatureRow>Independent non-overlapping history view</FeatureRow>
          <FeatureRow>Range models with path coverage and outcome tracking</FeatureRow>
          <FeatureRow>Automatic activation after PayPal subscription approval</FeatureRow>

          <View className="mt-6">
            {isAuthenticated ? (
              <PayPalSubscribeButton />
            ) : (
              <Pressable
                onPress={() => router.push("/login" as never)}
                className="rounded-2xl border border-violet-500/40 bg-violet-500/20 px-5 py-4 active:opacity-70"
              >
                <Text className="text-center font-black text-violet-200">
                  Create account before subscribing
                </Text>
              </Pressable>
            )}
          </View>

          {isPro ? (
            <Text className="mt-4 text-sm leading-6 text-emerald-300">
              Your account already has Pro access. Refresh the dashboard if a card
              still appears locked.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text className="text-xl font-black text-white">Performance labels</Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-400">
            Verified live accuracy comes from stored real predictions. Evaluation
            accuracy comes from purged out-of-sample walk-forward testing. New V3
            models keep both numbers separate while live outcomes accumulate. A
            model does not become live merely because its backtest wore a nice suit.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
