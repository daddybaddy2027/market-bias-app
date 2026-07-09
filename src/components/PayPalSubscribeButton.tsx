import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from "react-native";

import { useAuth } from "../providers/AuthProvider";

declare global {
  interface Window {
    paypal?: any;
  }
}

type StatusKind = "idle" | "loading" | "success" | "error";

function makeContainerId(userId?: string | null) {
  const suffix = String(userId ?? "guest")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);

  return `paypal-subscribe-button-${suffix}`;
}

function loadPayPalSdk(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("PayPal SDK can only load in the browser."));
      return;
    }

    if (window.paypal?.Buttons) {
      resolve();
      return;
    }

    const existing = document.getElementById("paypal-sdk-subscriptions") as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-subscriptions";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&components=buttons`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal SDK failed to load. Disable ad blockers and reload the page."));
    document.body.appendChild(script);
  });
}

export function PayPalSubscribeButton() {
  const { isAuthenticated, isPro, user, refreshProfile } = useAuth();

  const [status, setStatus] = useState<StatusKind>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const renderedRef = useRef(false);

  const clientId = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const planId = process.env.EXPO_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID ?? "";
  const paypalPlanUrl = planId
    ? `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${encodeURIComponent(planId)}`
    : "";

  const containerId = useMemo(() => makeContainerId(user?.id), [user?.id]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (!isAuthenticated || isPro || !user?.id) {
      return;
    }

    if (!clientId || !planId) {
      setStatus("error");
      setMessage("PayPal is not configured yet. Missing client ID or plan ID in Vercel / .env.local.");
      return;
    }

    if (renderedRef.current) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function renderButton() {
      try {
        setStatus("loading");
        setMessage("Loading secure PayPal checkout...");

        await loadPayPalSdk(clientId);

        if (cancelled) return;

        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error("PayPal button container not found.");
        }

        container.replaceChildren();

        const buttons = window.paypal.Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: (_data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: user.id,
            });
          },
          onApprove: async (data: any) => {
            setStatus("success");
            setMessage(
              `Payment approved. Pro access will unlock automatically. Subscription: ${data.subscriptionID ?? "created"}`
            );

            setTimeout(() => {
              refreshProfile().catch(() => undefined);
            }, 4000);
          },
          onCancel: () => {
            setStatus("idle");
            setMessage("Subscription checkout was cancelled.");
          },
          onError: (error: any) => {
            console.error("PayPal button error:", error);
            setStatus("error");
            setFallbackVisible(true);
            setMessage(error?.message ?? "PayPal checkout failed. Try a normal browser window without ad blockers.");
          },
        });

        if (!buttons.isEligible || buttons.isEligible()) {
          await buttons.render(`#${containerId}`);
        } else {
          throw new Error("PayPal subscription button is not eligible for this browser/account.");
        }

        renderedRef.current = true;
        setStatus("idle");
        setMessage(null);

        timeoutId = setTimeout(() => {
          const current = document.getElementById(containerId);
          if (current && current.childElementCount === 0) {
            setFallbackVisible(true);
            setStatus("error");
            setMessage("PayPal button did not render. Disable ad blockers, reload, or use the fallback PayPal subscription link.");
          }
        }, 6000);
      } catch (error: any) {
        setStatus("error");
        setFallbackVisible(true);
        setMessage(error?.message ?? "PayPal checkout failed to initialize.");
      }
    }

    renderButton();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clientId, planId, containerId, isAuthenticated, isPro, user?.id, refreshProfile]);

  if (!isAuthenticated) {
    return (
      <View className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-sm font-bold text-zinc-300">
          Create a Free account first, then subscribe to Pro from this page.
        </Text>
      </View>
    );
  }

  if (isPro) {
    return (
      <View className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <Text className="text-base font-black text-emerald-200">Pro access is active</Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-300">
          Your account already has Pro access.
        </Text>
      </View>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <View className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-sm leading-6 text-zinc-300">
          PayPal subscription checkout is available on the web version.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <Text className="mb-3 text-base font-black text-yellow-200">Subscribe with PayPal</Text>

      {React.createElement("div", {
        id: containerId,
        style: {
          minHeight: 72,
          width: "100%",
          display: "block",
        },
      })}

      {status === "loading" ? (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator color="#facc15" />
          <Text className="ml-3 text-sm text-zinc-300">{message ?? "Loading PayPal..."}</Text>
        </View>
      ) : null}

      {message && status !== "loading" ? (
        <Text className={`mt-3 text-sm leading-6 ${status === "error" ? "text-red-300" : status === "success" ? "text-emerald-300" : "text-zinc-300"}`}>
          {message}
        </Text>
      ) : null}

      {fallbackVisible && paypalPlanUrl ? (
        <Pressable
          onPress={() => Linking.openURL(paypalPlanUrl)}
          className="mt-4 rounded-xl border border-yellow-400/50 bg-yellow-400/20 px-4 py-3 active:opacity-70"
        >
          <Text className="text-center text-sm font-black text-yellow-100">
            Open PayPal subscription page
          </Text>
          <Text className="mt-2 text-center text-xs leading-5 text-yellow-100/80">
            Fallback link. Automatic unlock still depends on PayPal webhook receiving the subscription event.
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => refreshProfile()}
        className="mt-4 rounded-xl border border-zinc-700 px-4 py-3 active:opacity-70"
      >
        <Text className="text-center text-xs font-black uppercase tracking-[2px] text-zinc-300">
          Refresh account status
        </Text>
      </Pressable>
    </View>
  );
}