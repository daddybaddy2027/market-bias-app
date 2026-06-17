import "@/global.css";

import { Stack } from "expo-router";
import React from "react";

import { AuthProvider } from "../providers/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#000000",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="account" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="asset/[symbol]" />
      </Stack>
    </AuthProvider>
  );
}

