import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { useAuth } from "../providers/AuthProvider";

declare global {
  interface Window {
    paypal?: any;
  }
}

export type PayPalProduct = "models" | "outlook" | "complete";
type StatusKind = "idle" | "loading" | "success" | "error";

type PublicPayPalConfig = {
  configured: boolean;
  environment: "live";
  clientId: string;
  plans: Record<PayPalProduct, string>;
};

const PRODUCT_COPY: Record<PayPalProduct, { title: string; price: string }> = {
  models: { title: "Models", price: "€24.99 / month" },
  outlook: { title: "Outlook", price: "€25 / month" },
  complete: { title: "Complete", price: "€50 / month" },
};

let publicConfigPromise: Promise<PublicPayPalConfig> | null = null;

function makeContainerId(product: PayPalProduct, userId?: string | null) {
  const suffix = String(userId ?? "guest")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);

  return `paypal-subscribe-${product}-${suffix}`;
}

async function loadPublicPayPalConfig() {
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

  if (!supabaseUrl) {
    throw new Error("Supabase checkout configuration URL is missing.");
  }

  if (!publicConfigPromise) {
    publicConfigPromise = fetch(`${supabaseUrl}/functions/v1/paypal-public-config`, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.configured || !data?.clientId || !data?.plans) {
          throw new Error(data?.error ?? "PayPal checkout configuration could not be loaded.");
        }

        return data as PublicPayPalConfig;
      })
      .catch((error) => {
        publicConfigPromise = null;
        throw error;
      });
  }

  return publicConfigPromise;
}

function loadPayPalSdk(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("PayPal checkout can only load in a browser."));
      return;
    }

    if (window.paypal?.Buttons) {
      resolve();
      return;
    }

    const existing = document.getElementById(
      "paypal-sdk-subscriptions"
    ) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("PayPal SDK failed to load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-subscriptions";
    script.dataset.clientId = clientId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&vault=true&intent=subscription&components=buttons`;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () =>
      reject(
        new Error(
          "PayPal checkout failed to load. Disable ad blockers and reload the page."
        )
      );
    document.body.appendChild(script);
  });
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function PayPalSubscribeButton({
  product,
}: {
  product: PayPalProduct;
}) {
  const {
    isAuthenticated,
    hasModelsAccess,
    hasOutlookAccess,
    user,
    refreshProfile,
  } = useAuth();

  const [status, setStatus] = useState<StatusKind>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const renderedRef = useRef(false);

  const copy = PRODUCT_COPY[product];
  const active = product === "models"
    ? hasModelsAccess
    : product === "outlook"
      ? hasOutlookAccess
      : hasModelsAccess && hasOutlookAccess;
  const containerId = useMemo(
    () => makeContainerId(product, user?.id),
    [product, user?.id]
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isAuthenticated || active || !user?.id) return;
    if (renderedRef.current) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function renderButton() {
      try {
        setStatus("loading");
        setMessage(`Loading secure PayPal checkout for ${copy.title}...`);

        const config = await loadPublicPayPalConfig();
        const clientId = config.clientId;
        const planId = config.plans[product];

        if (!clientId || !planId) {
          throw new Error(`PayPal ${copy.title} checkout is not configured.`);
        }

        await loadPayPalSdk(clientId);
        if (cancelled) return;

        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error("PayPal button container was not found.");
        }

        container.replaceChildren();

        const buttons = window.paypal.Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
            height: 46,
          },
          createSubscription: (_data: any, actions: any) =>
            actions.subscription.create({
              plan_id: planId,
              custom_id: user.id,
            }),
          onApprove: async (data: any) => {
            setStatus("success");
            setMessage(
              `Subscription approved. Verified access is being activated through the PayPal webhook. ID: ${
                data.subscriptionID ?? "created"
              }`
            );

            for (const delay of [1800, 3200, 5000]) {
              await wait(delay);
              if (cancelled) return;
              await refreshProfile().catch(() => undefined);
            }
          },
          onCancel: () => {
            setStatus("idle");
            setMessage("Subscription checkout was cancelled. No access was changed.");
          },
          onError: (error: any) => {
            console.error("PayPal button error:", error);
            setStatus("error");
            setMessage(
              error?.message ??
                "PayPal checkout failed. Reload the page without an ad blocker and try again."
            );
          },
        });

        if (!buttons.isEligible || buttons.isEligible()) {
          await buttons.render(`#${containerId}`);
        } else {
          throw new Error(
            "PayPal subscription checkout is not eligible for this browser or account."
          );
        }

        renderedRef.current = true;
        setStatus("idle");
        setMessage(null);

        timeoutId = setTimeout(() => {
          const current = document.getElementById(containerId);
          if (current && current.childElementCount === 0) {
            setStatus("error");
            setMessage(
              "PayPal did not render. Disable browser extensions that block payment scripts and reload."
            );
          }
        }, 6500);
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message ?? "PayPal checkout failed to initialize.");
      }
    }

    void renderButton();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    active,
    containerId,
    copy.title,
    isAuthenticated,
    product,
    refreshProfile,
    user?.id,
  ]);

  if (!isAuthenticated) {
    return (
      <View className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-sm font-bold text-zinc-300">
          Create a free account before starting a subscription.
        </Text>
      </View>
    );
  }

  if (active) {
    return (
      <View className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <Text className="text-base font-black text-emerald-200">
          {copy.title} access is active
        </Text>
        <Text className="mt-2 text-sm leading-6 text-zinc-300">
          This account already has the required entitlement.
        </Text>
      </View>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <View className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
        <Text className="text-sm leading-6 text-zinc-300">
          PayPal subscription checkout is available in the web version.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <Text className="text-base font-black text-yellow-100">
        Subscribe to {copy.title}
      </Text>
      <Text className="mb-3 mt-1 text-xs font-bold text-yellow-100/70">
        {copy.price} · recurring until cancelled
      </Text>

      {React.createElement("div", {
        id: containerId,
        style: {
          minHeight: 64,
          width: "100%",
          display: "block",
        },
      })}

      {status === "loading" ? (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator color="#facc15" />
          <Text className="ml-3 flex-1 text-sm text-zinc-300">
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

      <Text className="mt-3 text-[11px] leading-5 text-zinc-400">
        Access is granted only after the server verifies a signed PayPal webhook. A browser approval screen alone cannot unlock the account.
      </Text>

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
