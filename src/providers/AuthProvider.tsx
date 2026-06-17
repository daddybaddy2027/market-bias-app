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

export type UserPlan =
  | "free"
  | "pro";

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
  createContext<AuthContextValue | null>(
    null
  );

function profileHasProAccess(
  profile: UserProfile | null
) {
  if (!profile) {
    return false;
  }

  if (profile.plan !== "pro") {
    return false;
  }

  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    return false;
  }

  if (!profile.subscription_expires_at) {
    return true;
  }

  const expiresAt =
    new Date(
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

  const [profileLoading, setProfileLoading] =
    useState(false);

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

    setProfileLoading(true);

    try {
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
          .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(
        (data as UserProfile | null) ??
          null
      );
    } catch (error) {
      console.error(
        "Failed to load profile:",
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

    setProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        setSession(
          data.session ?? null
        );
      } catch (error) {
        console.error(
          "Failed to restore session:",
          error
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    }

    restoreSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!mounted) {
            return;
          }

          setSession(
            nextSession ?? null
          );

          setInitializing(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadProfile(
      session?.user.id
    );
  }, [session?.user.id]);

  const value =
    useMemo<AuthContextValue>(
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
          profileHasProAccess(profile),
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
  const value =
    useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return value;
}

