import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AppTopNav } from "../components/AppTopNav";
import { useAuth } from "../providers/AuthProvider";

declare global {
  interface Window { paypalSandbox?: any; }
}

const CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID ?? "";
const MODELS_PLAN_ID = process.env.EXPO_PUBLIC_PAYPAL_SANDBOX_MODELS_PLAN_ID ?? "";

function loadSandboxSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Browser required."));
    if (window.paypalSandbox?.Buttons) return resolve();

    const existing = document.getElementById("paypal-sdk-sandbox") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Sandbox PayPal SDK failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-sandbox";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CLIENT_ID)}&vault=true&intent=subscription&components=buttons&debug=true`;
    script.async = true;
    script.onload = () => {
      window.paypalSandbox = (window as any).paypal;
      resolve();
    };
    script.onerror = () => reject(new Error("Sandbox PayPal SDK failed to load."));
    document.body.appendChild(script);
  });
}

export default function PricingSandboxScreen() {
  const { isAuthenticated, user, refreshProfile, hasModelsAccess } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const rendered = useRef(false);
  const containerId = useMemo(() => `paypal-sandbox-models-${String(user?.id ?? "guest").replace(/[^a-zA-Z0-9_-]/g, "")}`, [user?.id]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isAuthenticated || !user?.id || hasModelsAccess) return;
    if (!CLIENT_ID || !MODELS_PLAN_ID) {
      setMessage("Sandbox is not configured yet. Add the sandbox Client ID and Models Plan ID to this Preview environment.");
      return;
    }
    if (rendered.current) return;

    let cancelled = false;
    async function mount() {
      try {
        setLoading(true);
        setMessage("Loading PayPal Sandbox...");
        await loadSandboxSdk();
        if (cancelled) return;
        const node = document.getElementById(containerId);
        if (!node) throw new Error("Sandbox button container missing.");
        node.replaceChildren();
        const buttons = window.paypalSandbox.Buttons({
          style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe", height: 46 },
          createSubscription: (_data: any, actions: any) => actions.subscription.create({
            plan_id: MODELS_PLAN_ID,
            custom_id: user.id,
          }),
          onApprove: async (data: any) => {
            setMessage(`Sandbox subscription approved: ${data.subscriptionID ?? "created"}. Waiting for verified webhook...`);
            for (const delay of [1500, 3000, 5000]) {
              await new Promise((r) => setTimeout(r, delay));
              await refreshProfile().catch(() => undefined);
            }
          },
          onCancel: () => setMessage("Sandbox checkout cancelled. No entitlement changed."),
          onError: (error: any) => setMessage(error?.message ?? "Sandbox checkout failed."),
        });
        await buttons.render(`#${containerId}`);
        rendered.current = true;
        setMessage("");
      } catch (error: any) {
        setMessage(error?.message ?? "Sandbox checkout failed to initialize.");
      } finally {
        setLoading(false);
      }
    }
    void mount();
    return () => { cancelled = true; };
  }, [containerId, hasModelsAccess, isAuthenticated, refreshProfile, user?.id]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopNav />
        <View style={styles.hero}>
          <Text style={styles.kicker}>PAYPAL SANDBOX · TEST ONLY</Text>
          <Text style={styles.title}>Models subscription end-to-end test</Text>
          <Text style={styles.body}>This page is isolated from the live pricing checkout. It is intended only for PayPal Sandbox buyer accounts and fake money.</Text>
        </View>

        {!isAuthenticated ? (
          <Pressable style={styles.login} onPress={() => router.push("/login" as never)}><Text style={styles.loginText}>Log in to the test account first</Text></Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={styles.badge}>SANDBOX MODELS</Text>
            <Text style={styles.price}>€24.99 / month</Text>
            <Text style={styles.meta}>custom_id = current Supabase user ID</Text>
            {hasModelsAccess ? (
              <View style={styles.success}><Text style={styles.successText}>MODELS ACCESS ACTIVE ✅</Text></View>
            ) : (
              React.createElement("div", { id: containerId, style: { minHeight: 64, width: "100%", display: "block", marginTop: 18 } })
            )}
            {loading ? <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} /> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Pressable style={styles.refresh} onPress={() => refreshProfile()}><Text style={styles.refreshText}>REFRESH ACCOUNT STATUS</Text></Pressable>
          </View>
        )}

        <Text style={styles.warning}>TEST ONLY. Never enter a real card or approve a live PayPal payment on this page.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050505" },
  content: { width: "100%", maxWidth: 900, alignSelf: "center", padding: 20, paddingBottom: 80 },
  hero: { marginTop: 22, marginBottom: 20, borderWidth: 1, borderColor: "#92400e", backgroundColor: "#1c1207", borderRadius: 24, padding: 22 },
  kicker: { color: "#fbbf24", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  title: { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 12 },
  body: { color: "#a1a1aa", fontSize: 15, lineHeight: 24, marginTop: 10 },
  card: { borderWidth: 1, borderColor: "#713f12", backgroundColor: "#0f0a03", borderRadius: 24, padding: 22 },
  badge: { color: "#fde68a", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  price: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 10 },
  meta: { color: "#71717a", fontSize: 12, marginTop: 6 },
  message: { color: "#e4e4e7", fontSize: 13, lineHeight: 20, marginTop: 14 },
  success: { marginTop: 18, borderWidth: 1, borderColor: "#10b981", backgroundColor: "#022c22", borderRadius: 16, padding: 16 },
  successText: { color: "#6ee7b7", fontWeight: "900" },
  refresh: { marginTop: 18, borderWidth: 1, borderColor: "#52525b", borderRadius: 14, padding: 14 },
  refreshText: { color: "#d4d4d8", textAlign: "center", fontWeight: "900", fontSize: 11, letterSpacing: 1.5 },
  login: { borderWidth: 1, borderColor: "#2563eb", backgroundColor: "#172554", borderRadius: 16, padding: 16 },
  loginText: { color: "#dbeafe", textAlign: "center", fontWeight: "900" },
  warning: { color: "#fca5a5", fontSize: 11, lineHeight: 18, marginTop: 18, textAlign: "center" },
});
