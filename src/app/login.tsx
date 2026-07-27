import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

type MessageType = "error" | "success" | "info";

type MessageState = {
  type: MessageType;
  text: string;
} | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { initializing, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState<"signin" | "signup" | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      router.replace("/account" as never);
    }
  }, [initializing, isAuthenticated]);

  function validate() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage({ type: "error", text: "Enter your email address." });
      return null;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setMessage({ type: "error", text: "Enter a valid email address." });
      return null;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must contain at least 6 characters.",
      });
      return null;
    }

    return cleanEmail;
  }

  async function handleSignIn() {
    const cleanEmail = validate();
    if (!cleanEmail || loadingAction) return;

    setLoadingAction("signin");
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error("Supabase did not return an active session.");
      }

      router.replace("/account" as never);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message ?? "Sign in failed.",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSignUp() {
    const cleanEmail = validate();
    if (!cleanEmail || loadingAction) return;

    setLoadingAction("signup");
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setMessage({
          type: "success",
          text: "Account created. You are signed in on the Free plan.",
        });
        router.replace("/account" as never);
        return;
      }

      setMessage({
        type: "info",
        text: "Account request received. Check your email and confirm the address before signing in.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message ?? "Account creation failed.",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  const busy = Boolean(loadingAction);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SECURE ACCOUNT</Text>
          </View>

          <Text style={styles.eyebrow}>AI MARKET EXPERT</Text>
          <Text style={styles.title}>Sign in or create an account</Text>
          <Text style={styles.description}>
            Every account begins on the Free plan. Models and Outlook access are
            activated only through the subscription or manual partner system.
          </Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor="#71717a"
            style={styles.input}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="#71717a"
            style={styles.input}
            onSubmitEditing={() => void handleSignIn()}
          />

          {message ? (
            <View
              style={[
                styles.messageBox,
                message.type === "error"
                  ? styles.errorBox
                  : message.type === "success"
                    ? styles.successBox
                    : styles.infoBox,
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={() => void handleSignIn()}
            style={({ pressed }) => [
              styles.primaryButton,
              busy && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loadingAction === "signin" ? (
              <ActivityIndicator color="#6ee7b7" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => void handleSignUp()}
            style={({ pressed }) => [
              styles.secondaryButton,
              busy && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loadingAction === "signup" ? (
              <ActivityIndicator color="#e4e4e7" />
            ) : (
              <Text style={styles.secondaryButtonText}>Create Free account</Text>
            )}
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => router.replace("/" as never)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>← Back to dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 28,
    backgroundColor: "#09090b",
    padding: 24,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#047857",
    borderRadius: 999,
    backgroundColor: "#022c22",
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 22,
  },
  badgeText: {
    color: "#6ee7b7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  eyebrow: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4,
  },
  title: {
    marginTop: 15,
    color: "#ffffff",
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "900",
  },
  description: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 25,
  },
  label: {
    marginTop: 24,
    marginBottom: 9,
    color: "#71717a",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  input: {
    width: "100%",
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 16,
    backgroundColor: "#18181b",
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageBox: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
  },
  errorBox: {
    borderColor: "#b91c1c",
    backgroundColor: "#450a0a",
  },
  successBox: {
    borderColor: "#047857",
    backgroundColor: "#022c22",
  },
  infoBox: {
    borderColor: "#0369a1",
    backgroundColor: "#082f49",
  },
  messageText: {
    color: "#f4f4f5",
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    minHeight: 55,
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
  secondaryButton: {
    minHeight: 55,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 16,
    backgroundColor: "#18181b",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "900",
  },
  backButton: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  backText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
