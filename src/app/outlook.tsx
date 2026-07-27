import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  OUTLOOKS,
  OUTLOOK_STRUCTURE,
  TechnicalFundamentalOutlook,
} from "../config/outlookContent";
import { useAuth } from "../providers/AuthProvider";

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

function formatPublishedAt(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function OutlookMeta({ outlook }: { outlook: TechnicalFundamentalOutlook }) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
        <Text className="text-xs font-black text-zinc-300">
          By {outlook.author}
        </Text>
      </View>
      <View className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2">
        <Text className="text-xs font-black text-zinc-300">
          {formatPublishedAt(outlook.publishedAt)}
        </Text>
      </View>
    </View>
  );
}

export default function OutlookScreen() {
  const {
    isAuthenticated,
    hasOutlookAccess,
  } = useAuth();

  const orderedOutlooks = useMemo(
    () =>
      [...OUTLOOKS].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      ),
    []
  );

  const [selectedId, setSelectedId] = useState(
    orderedOutlooks[0]?.id ?? ""
  );

  const selected =
    orderedOutlooks.find((item) => item.id === selectedId) ??
    orderedOutlooks[0];

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
            ← Back
          </Text>
        </Pressable>

        <View className="mb-7">
          <Text className="text-xs font-black uppercase tracking-[4px] text-sky-300">
            HUMAN MARKET CONTEXT
          </Text>
          <Text className="mt-4 text-4xl font-black leading-tight text-white">
            Technical and Fundamental Outlook
          </Text>
          <Text className="mt-4 text-base leading-7 text-zinc-400">
            Weekly macro, sentiment and technical analysis for the main FX
            currencies and pairs. The outlook is updated around major market
            events, while every previous publication remains available in the
            historical archive.
          </Text>
        </View>

        {selected ? (
          <Card className="mb-5 border-sky-500/30 bg-sky-500/10">
            <Text className="text-xs font-black uppercase tracking-[3px] text-sky-300">
              Latest outlook
            </Text>
            <Text className="mt-3 text-2xl font-black text-white">
              {selected.title}
            </Text>
            <OutlookMeta outlook={selected} />

            <View className="mt-5">
              {selected.preview.slice(0, 2).map((sentence) => (
                <Text
                  key={sentence}
                  className="mb-3 text-base leading-7 text-zinc-200"
                >
                  {sentence}
                </Text>
              ))}
            </View>

            {hasOutlookAccess ? (
              <View className="mt-3">
                {selected.sections.map((section) => (
                  <View
                    key={section.key}
                    className="mb-4 rounded-2xl border border-zinc-800 bg-black/30 p-4"
                  >
                    <Text className="text-sm font-black uppercase tracking-[2px] text-violet-300">
                      {section.title}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-zinc-300">
                      {section.body}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="mt-4 rounded-3xl border border-violet-500/40 bg-violet-500/10 p-5">
                <Text className="text-xs font-black uppercase tracking-[3px] text-violet-300">
                  Premium outlook
                </Text>
                <Text className="mt-3 text-2xl font-black text-white">
                  The complete analysis is locked
                </Text>
                <Text className="mt-3 text-sm leading-6 text-zinc-300">
                  The preview remains public. Full access includes the entire
                  weekly outlook, event updates and the historical archive.
                </Text>

                <View className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                  <Text className="text-sm font-black text-white">
                    What each outlook can include
                  </Text>
                  {OUTLOOK_STRUCTURE.map((item) => (
                    <View
                      key={item}
                      className="mt-3 flex-row items-start"
                    >
                      <Text className="mr-3 text-emerald-300">✓</Text>
                      <Text className="flex-1 text-sm leading-6 text-zinc-300">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                  <View>
                    <Text className="text-xs font-black uppercase tracking-[2px] text-violet-300">
                      Outlook access
                    </Text>
                    <Text className="mt-1 text-3xl font-black text-white">
                      €25
                    </Text>
                    <Text className="text-xs text-zinc-400">
                      per month
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      router.push(
                        (isAuthenticated ? "/pricing" : "/login") as never
                      )
                    }
                    className="rounded-2xl border border-violet-400/40 bg-violet-500/20 px-5 py-4 active:opacity-70"
                  >
                    <Text className="font-black text-violet-100">
                      {isAuthenticated
                        ? "View plan"
                        : "Create account"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Card>
        ) : (
          <Card className="mb-5">
            <Text className="text-zinc-400">
              No outlook has been published yet.
            </Text>
          </Card>
        )}

        <View className="mb-3 mt-3">
          <Text className="text-xs font-black uppercase tracking-[3px] text-zinc-500">
            Historical archive
          </Text>
          <Text className="mt-2 text-2xl font-black text-white">
            Previous outlooks
          </Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            When a new outlook is published, the previous one remains here with
            its original publication date and thesis.
          </Text>
        </View>

        {orderedOutlooks.map((outlook, index) => (
          <Pressable
            key={outlook.id}
            onPress={() => setSelectedId(outlook.id)}
            className={`mb-3 rounded-3xl border p-5 active:opacity-70 ${
              selected?.id === outlook.id
                ? "border-sky-500/40 bg-sky-500/10"
                : "border-zinc-800 bg-zinc-950"
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
                  {index === 0 ? "Current" : "Archived"}
                </Text>
                <Text className="mt-2 text-lg font-black text-white">
                  {outlook.title}
                </Text>
                <Text className="mt-2 text-sm text-zinc-400">
                  {formatPublishedAt(outlook.publishedAt)} · {outlook.author}
                </Text>
              </View>
              <Text className="text-xl text-zinc-500">→</Text>
            </View>
          </Pressable>
        ))}

        <Text className="mt-5 text-center text-xs leading-5 text-zinc-600">
          Educational market commentary only. Not financial advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
