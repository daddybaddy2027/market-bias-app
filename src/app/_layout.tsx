import "@/global.css";

import { Analytics } from "@vercel/analytics/react";
import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { AuthProvider } from "../providers/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#050505",
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="macro" />
          <Stack.Screen name="performance" />
          <Stack.Screen name="xau-bot" />
          <Stack.Screen name="outlook" />
          <Stack.Screen name="admin-outlook" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="update-password" />
          <Stack.Screen name="account" />
          <Stack.Screen name="pricing" />
          <Stack.Screen name="asset/[symbol]" />
        </Stack>

        {Platform.OS === "web" ? <Analytics /> : null}
      </>
    </AuthProvider>
  );
}
