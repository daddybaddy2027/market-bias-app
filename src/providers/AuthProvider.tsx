import type {
    Session,
    User,
} from "@supabase/supabase-js";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../lib/supabase";

export type UserPlan = "free" | "pro";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type UserProfile = {
  user_id: string;
  email: string | null;
  plan: UserPlan;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  provider_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  initializing: boolean;
  profileLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isPro: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

function calculateIsPro(
  profile: UserProfile | null
) {
  if (!profile) {
    return false;
  }

  const activeStatus =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";

  if (
    profile.plan !== "pro" ||
    !activeStatus
  ) {
    return false;
  }

  if (!profile.subscription_expires_at) {
    return true;
  }

  const expiresAt = new Date(
    profile.subscription_expires_at
  ).getTime();

  return (
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initializing, setInitializing] =
    useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  async function loadProfile(
    userId?: string
  ) {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      setProfileLoading(true);

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            [
              "user_id",
              "email",
              "plan",
              "subscription_status",
              "subscription_expires_at",
              "provider_customer_id",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq("user_id", userId)
          .single();

      if (error) {
        throw error;
      }

      setProfile(
        data as UserProfile
      );
    } catch (error) {
      console.error(
        "Failed to load Supabase profile:",
        error
      );

      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  async function refreshProfile() {
    await loadProfile(
      session?.user.id
    );
  }

  async function signOut() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          console.error(
            "Failed to restore session:",
            error
          );
        }

        setSession(
          data.session ?? null
        );

        setInitializing(false);
      });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(
            nextSession ?? null
          );
        }
      );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadProfile(
      session?.user.id
    );
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      profileLoading,
      session,
      user:
        session?.user ?? null,
      profile,
      isAuthenticated:
        Boolean(session?.user),
      isPro:
        calculateIsPro(profile),
      refreshProfile,
      signOut,
    }),
    [
      initializing,
      profileLoading,
      session,
      profile,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
