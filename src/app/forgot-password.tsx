import { router } from "expo-router";
import React, { useState } from "react";
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

import { getAuthRedirectUrl } from "../lib/authRedirects";
import { supabase } from "../lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendRecoveryEmail() {
    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Enter a valid email address.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: getAuthRedirectUrl("update-password"),
        }
      );

      if (recoveryError) throw recoveryError;

      setMessage(
        "Password recovery email sent. Open the link on the same device where you want to set the new password."
      );
    } catch (recoveryError: any) {
      setError(recoveryError?.message ?? "Password recovery email could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ACCOUNT RECOVERY</Text>
          </View>

          <Text style={styles.eyebrow}>AI MARKET EXPERT</Text>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.description}>
            Enter the email used for your account. We will send a secure link that opens
            the new-password screen.
          </Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor="#71717a"
            style={styles.input}
            onSubmitEditing={() => void sendRecoveryEmail()}
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
            disabled={loading}
            onPress={() => void sendRecoveryEmail()}
            style={({ pressed }) => [
              styles.primaryButton,
              loading && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#7dd3fc" />
            ) : (
              <Text style={styles.primaryButtonText}>Send recovery link</Text>
            )}
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={() => router.replace("/login" as never)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>← Back to sign in</Text>
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
    borderColor: "#0369a1",
    borderRadius: 999,
    backgroundColor: "#082f49",
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 22,
  },
  badgeText: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  eyebrow: {
    color: "#38bdf8",
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
    borderColor: "#0284c7",
    borderRadius: 16,
    backgroundColor: "#082f49",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: "#bae6fd",
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
    color: "#a1a1aa",
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
