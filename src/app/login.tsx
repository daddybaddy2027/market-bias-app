import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

function showMessage(
  title: string,
  message: string
) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function LoginScreen() {
  const { isAuthenticated } =
    useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function signIn() {
    try {
      setLoading(true);

      const { error } =
        await supabase.auth
          .signInWithPassword({
            email: email.trim(),
            password,
          });

      if (error) {
        throw error;
      }

      router.replace(
        "/account" as never
      );
    } catch (error: any) {
      showMessage(
        "Sign-in failed",
        error?.message ??
          "Unknown sign-in error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        showMessage(
          "Account created",
          "You are signed in as a Free user."
        );

        router.replace(
          "/account" as never
        );

        return;
      }

      showMessage(
        "Check your email",
        "The account was created, but email confirmation is enabled."
      );
    } catch (error: any) {
      showMessage(
        "Sign-up failed",
        error?.message ??
          "Unknown sign-up error"
      );
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-2xl font-black text-white">
          You are already signed in
        </Text>

        <Pressable
          onPress={() =>
            router.replace(
              "/account" as never
            )
          }
          className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3"
        >
          <Text className="font-black text-emerald-300">
            Open account
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-10"
      >
        <View className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <Text className="text-xs font-black uppercase tracking-[4px] text-emerald-400">
            AI Market Expert
          </Text>

          <Text className="mt-4 text-3xl font-black text-white">
            Sign in or create an account
          </Text>

          <Text className="mt-3 text-sm leading-6 text-zinc-400">
            Every new account starts on the Free plan.
            Only the secure backend can activate Pro.
          </Text>

          <Text className="mt-6 text-xs font-black uppercase tracking-[2px] text-zinc-500">
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#71717a"
            className="mt-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white"
          />

          <Text className="mt-4 text-xs font-black uppercase tracking-[2px] text-zinc-500">
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="#71717a"
            className="mt-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white"
          />

          <Pressable
            disabled={loading}
            onPress={signIn}
            className={`mt-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 px-5 py-4 ${
              loading ? "opacity-50" : ""
            }`}
          >
            <Text className="text-center font-black text-emerald-300">
              {loading
                ? "Working..."
                : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={signUp}
            className={`mt-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 ${
              loading ? "opacity-50" : ""
            }`}
          >
            <Text className="text-center font-black text-zinc-200">
              Create Free account
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.back()
            }
            className="mt-5 px-5 py-3"
          >
            <Text className="text-center font-bold text-zinc-500">
              Back
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
