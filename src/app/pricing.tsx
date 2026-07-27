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
import { OUTLOOK_STRUCTURE } from "../config/outlookContent";

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

function Price({
  value,
  label = "per month",
}: {
  value: string;
  label?: string;
}) {
  return (
    <View className="items-end">
      <View className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1">
        <Text className="text-xs font-black text-violet-200">MONTHLY</Text>
      </View>
      <Text className="mt-3 text-3xl font-black text-white">{value}</Text>
      <Text className="mt-1 text-xs font-bold text-zinc-400">{label}</Text>
    </View>
  );
}

function PendingCheckoutButton({
  label,
  isAuthenticated,
}: {
  label: string;
  isAuthenticated: boolean;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push((isAuthenticated ? "/account" : "/login") as never)
      }
      className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 active:opacity-70"
    >
      <Text className="text-center font-black text-zinc-200">
        {isAuthenticated ? label : "Create account before subscribing"}
      </Text>
      <Text className="mt-2 text-center text-xs leading-5 text-zinc-500">
        Checkout activates after the corresponding PayPal plan is connected.
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
            AI MARKET EXPERT PLANS
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Models, analyst outlook, or the complete market view.
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Choose the model board, the Technical and Fundamental Outlook, or combine both products in one complete package.
          </Text>
        </View>

        <Card className="mb-5 border-emerald-500/30 bg-emerald-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">Free</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                {freeModels.length} live model view plus public market context
              </Text>
            </View>
            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
              <Text className="text-xs font-black text-emerald-300">€0</Text>
            </View>
          </View>
          <FeatureRow>GBPUSD 12h Final V2 direction model</FeatureRow>
          <FeatureRow>Session-filtered public prediction schedule</FeatureRow>
          <FeatureRow>Core macro regime, market state and currency strength</FeatureRow>
          <FeatureRow>Two-sentence preview of the latest analyst outlook</FeatureRow>
          <FeatureRow>Locked preview of all twelve Pro models</FeatureRow>
          <FeatureRow included={false}>Complete model board and model history</FeatureRow>
          <FeatureRow included={false}>Full analyst outlook and historical archive</FeatureRow>
        </Card>

        <Card className="mb-5 border-violet-500/40 bg-violet-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">Models</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                Full {MODEL_CATALOG.length}-model board
              </Text>
            </View>
            <Price value="€24.99" />
          </View>

          <FeatureRow>All {MODEL_CATALOG.length} model cards, including {proModels.length} Pro models</FeatureRow>
          <FeatureRow>Current bias, probability, confidence and forecast zones</FeatureRow>
          <FeatureRow>Verified live and evaluation metrics kept clearly separated</FeatureRow>
          <FeatureRow>Independent non-overlapping history view</FeatureRow>
          <FeatureRow>Range models with path coverage and outcome tracking</FeatureRow>
          <FeatureRow included={false}>Full Technical and Fundamental Outlook</FeatureRow>

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

          {hasModelsAccess ? (
            <Text className="mt-4 text-sm leading-6 text-emerald-300">
              Your account has Models access.
            </Text>
          ) : null}
        </Card>

        <Card className="mb-5 border-sky-500/40 bg-sky-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">
                Technical and Fundamental Outlook
              </Text>
              <Text className="mt-1 text-sm text-zinc-400">
                Human macro, sentiment and technical commentary
              </Text>
            </View>
            <Price value="€25" />
          </View>

          {OUTLOOK_STRUCTURE.slice(3).map((item) => (
            <FeatureRow key={item}>{item}</FeatureRow>
          ))}
          <FeatureRow>Two or three updates per week when market conditions require them</FeatureRow>
          <FeatureRow>Every previous outlook stored in the historical archive</FeatureRow>
          <FeatureRow included={false}>Complete Pro model board</FeatureRow>

          {hasOutlookAccess ? (
            <Pressable
              onPress={() => router.push("/outlook" as never)}
              className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 active:opacity-70"
            >
              <Text className="text-center font-black text-emerald-200">
                Open your outlook access
              </Text>
            </Pressable>
          ) : (
            <PendingCheckoutButton
              label="Outlook checkout coming next"
              isAuthenticated={isAuthenticated}
            />
          )}
        </Card>

        <Card className="mb-5 border-amber-500/40 bg-amber-500/10">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-white">Complete</Text>
              <Text className="mt-1 text-sm text-zinc-400">
                Models plus Technical and Fundamental Outlook
              </Text>
            </View>
            <Price value="€49.99" />
          </View>

          <FeatureRow>Everything included in the Models package</FeatureRow>
          <FeatureRow>Everything included in the Outlook package</FeatureRow>
          <FeatureRow>Automated cross-asset model view plus human market interpretation</FeatureRow>
          <FeatureRow>Full model history and full outlook archive</FeatureRow>
          <FeatureRow>One subscription for the complete platform</FeatureRow>

          {hasCompleteAccess ? (
            <Pressable
              onPress={() => router.push("/outlook" as never)}
              className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 active:opacity-70"
            >
              <Text className="text-center font-black text-emerald-200">
                Complete access is active
              </Text>
            </Pressable>
          ) : (
            <PendingCheckoutButton
              label="Complete checkout coming next"
              isAuthenticated={isAuthenticated}
            />
          )}
        </Card>

        <Card>
          <Text className="text-xl font-black text-white">Performance and commentary labels</Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-400">
            Model accuracy comes from stored predictions and purged evaluation. Analyst outlooks are market commentary with a documented publication date, base case and invalidation. Neither is a guarantee of future performance, because markets remain stubbornly uninterested in our pricing page.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
