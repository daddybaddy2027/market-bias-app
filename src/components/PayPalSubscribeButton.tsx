import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

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

    const existing = document.getElementById("paypal-sdk-subscriptions");

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
    script.onerror = () => reject(new Error("PayPal SDK failed to load."));
    document.body.appendChild(script);
  });
}

export function PayPalSubscribeButton() {
  const {
    isAuthenticated,
    isPro,
    user,
    refreshProfile,
  } = useAuth();

  const [status, setStatus] = useState<StatusKind>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const renderedRef = useRef(false);

  const clientId = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const planId = process.env.EXPO_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID ?? "";

  const containerId = useMemo(
    () => makeContainerId(user?.id),
    [user?.id]
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (!isAuthenticated || isPro || !user?.id) {
      return;
    }

    if (!clientId || !planId) {
      setStatus("error");
      setMessage("PayPal is not configured yet. Missing client ID or plan ID.");
      return;
    }

    if (renderedRef.current) {
      return;
    }

    let cancelled = false;

    async function renderButton() {
      try {
        setStatus("loading");
        setMessage("Loading secure PayPal checkout...");

        await loadPayPalSdk(clientId);

        if (cancelled) {
          return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error("PayPal button container not found.");
        }

        container.replaceChildren();

        await window.paypal.Buttons({
          style: {
            shape: "pill",
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

            // PayPal webhook usually arrives quickly, but give it a few seconds before refreshing.
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
            setMessage(error?.message ?? "PayPal checkout failed.");
          },
        }).render(`#${containerId}`);

        renderedRef.current = true;
        setStatus("idle");
        setMessage(null);
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message ?? "PayPal checkout failed to initialize.");
      }
    }

    renderButton();

    return () => {
      cancelled = true;
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
        <Text className="text-base font-black text-emerald-200">
          Pro access is active
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-300">
          Your account already has Pro access. The market, tragically, remains harder to control.
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
      <Text className="mb-3 text-base font-black text-yellow-200">
        Subscribe with PayPal
      </Text>

      {React.createElement("div", {
        id: containerId,
        style: {
          minHeight: 48,
        },
      })}

      {status === "loading" ? (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator color="#facc15" />
          <Text className="ml-3 text-sm text-zinc-300">
            {message ?? "Loading PayPal..."}
          </Text>
        </View>
      ) : null}

      {message && status !== "loading" ? (
        <Text
          className={`mt-3 text-sm leading-6 ${
            status === "error"
              ? "text-red-300"
              : status === "success"
              ? "text-emerald-300"
              : "text-zinc-300"
          }`}
        >
          {message}
        </Text>
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