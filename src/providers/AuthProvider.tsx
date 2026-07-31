import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
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
  subscription_provider: string | null;
  subscription_expires_at: string | null;
  subscription_started_at?: string | null;
  subscription_updated_at?: string | null;
  provider_customer_id: string | null;
  provider_subscription_id?: string | null;
  paypal_plan_id?: string | null;
  models_access: boolean | null;
  outlook_access: boolean | null;
  is_admin?: boolean | null;
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
  isAdmin: boolean;
  hasModelsAccess: boolean;
  hasOutlookAccess: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function profileSubscriptionIsActive(profile: UserProfile | null) {
  if (!profile) return false;

  if (
    profile.subscription_status !== "active" &&
    profile.subscription_status !== "trialing"
  ) {
    return false;
  }

  if (!profile.subscription_expires_at) return true;

  const expiresAt = new Date(profile.subscription_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function legacyProfileHasProAccess(profile: UserProfile | null) {
  return Boolean(
    profile?.plan === "pro" && profileSubscriptionIsActive(profile)
  );
}

function legacyPayPalPlanIsModels(profile: UserProfile | null) {
  if (profile?.subscription_provider !== "paypal") return false;

  const expectedModelsPlan =
    process.env.EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID ??
    process.env.EXPO_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID ??
    "";

  return Boolean(
    expectedModelsPlan &&
      profile.paypal_plan_id &&
      profile.paypal_plan_id === expectedModelsPlan
  );
}

function profileHasModelsAccess(profile: UserProfile | null) {
  if (!profileSubscriptionIsActive(profile)) return false;

  if (profile?.models_access === true) return true;

  if (profile?.models_access === false) {
    // Compatibility only for an existing single-plan Models subscriber.
    // An explicit false on an Outlook plan must remain false.
    return legacyPayPalPlanIsModels(profile) && legacyProfileHasProAccess(profile);
  }

  return legacyProfileHasProAccess(profile);
}

function profileHasOutlookAccess(profile: UserProfile | null) {
  if (!profileSubscriptionIsActive(profile)) return false;

  if (typeof profile?.outlook_access === "boolean") {
    return profile.outlook_access;
  }

  return legacyProfileHasProAccess(profile);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      setProfile((data as UserProfile | null) ?? null);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session?.user.id]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setProfile(null);
    setSession(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        setSession(data.session ?? null);
      } catch (error) {
        console.error("Failed to restore session:", error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setInitializing(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void loadProfile(session?.user.id).catch(() => undefined);
  }, [loadProfile, session?.user.id]);

  const value = useMemo<AuthContextValue>(() => {
    const hasModelsAccess = profileHasModelsAccess(profile);
    const hasOutlookAccess = profileHasOutlookAccess(profile);

    return {
      initializing,
      profileLoading,
      session,
      user: session?.user ?? null,
      profile,
      isAuthenticated: Boolean(session?.user),
      isPro: hasModelsAccess,
      isAdmin: profile?.is_admin === true,
      hasModelsAccess,
      hasOutlookAccess,
      refreshProfile,
      signOut,
    };
  }, [
    initializing,
    profileLoading,
    session,
    profile,
    refreshProfile,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
