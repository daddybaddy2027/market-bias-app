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

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function inspectSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setHasRecoverySession(false);
      } else {
        setHasRecoverySession(Boolean(data.session));
      }

      setCheckingSession(false);
    }

    void inspectSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword() {
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The two password fields do not match.");
      return;
    }

    if (!hasRecoverySession) {
      setError("The recovery session is missing or expired. Request a new recovery email.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setMessage("Password updated successfully. Redirecting to your account...");
      setTimeout(() => router.replace("/account" as never), 700);
    } catch (updateError: any) {
      setError(updateError?.message ?? "The password could not be updated.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#7dd3fc" />
        <Text style={styles.loadingText}>Verifying recovery link...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SECURE PASSWORD UPDATE</Text>
          </View>

          <Text style={styles.eyebrow}>AI MARKET EXPERT</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.description}>
            The recovery link creates a temporary authenticated session. Set the new
            password before the link expires.
          </Text>

          {!hasRecoverySession ? (
            <View style={[styles.messageBox, styles.errorBox]}>
              <Text style={styles.messageText}>
                This recovery link is missing, expired or has already been used. Request a
                new one from the login page.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            editable={!loading && hasRecoverySession}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            placeholder="At least 8 characters"
            placeholderTextColor="#71717a"
            style={styles.input}
          />

          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading && hasRecoverySession}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            placeholder="Repeat the new password"
            placeholderTextColor="#71717a"
            style={styles.input}
            onSubmitEditing={() => void updatePassword()}
          />

          {error ? (
            <View style={[styles.messageBox, styles.errorBox]}>
              <Text style={styles.messageText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={[styles.messageBox, styles.successBox]}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={loading || !hasRecoverySession}
            onPress={() => void updatePassword()}
            style={({ pressed }) => [
              styles.primaryButton,
              (loading || !hasRecoverySession) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#6ee7b7" />
            ) : (
              <Text style={styles.primaryButtonText}>Update password</Text>
            )}
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={() => router.replace("/forgot-password" as never)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Request another recovery link</Text>
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
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    marginTop: 12,
    color: "#a1a1aa",
    fontWeight: "700",
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
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
