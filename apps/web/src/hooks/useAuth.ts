"use client";

import { useCallback, useEffect, useState } from "react";
import {
  enterDemoAs,
  getStoredUser,
  initLiff,
  isDemoMode,
  storeUser,
} from "@/lib/liff";
import {
  exchangeLineToken,
  restoreAccessToken,
  setAccessToken,
} from "@/lib/api";
import type { User } from "@/lib/types";

const DEMO_TOKENS: Record<"organizer" | "member" | "admin", string> = {
  organizer: "demo:organizer",
  member: "demo:member",
  admin: "demo:organizer",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      restoreAccessToken();
      const stored = getStoredUser();
      if (stored) {
        if (!cancelled) {
          setUser(stored);
          setReady(true);
        }
        return;
      }

      if (isDemoMode()) {
        if (!cancelled) setReady(true);
        return;
      }

      const liff = await initLiff();
      if (cancelled) return;
      if (!liff.ready) {
        setError(liff.error || "Waiting for LINE login…");
        setReady(true);
        return;
      }
      if (liff.idToken) {
        const session = await exchangeLineToken(liff.idToken);
        if (session) {
          storeUser(session.user);
          setUser(session.user);
        } else if (liff.profile) {
          const fallback: User = {
            id: liff.profile.userId,
            displayName: liff.profile.displayName,
            role: "member",
            pictureUrl: liff.profile.pictureUrl,
          };
          storeUser(fallback);
          setUser(fallback);
        }
      }
      setReady(true);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const demoLogin = useCallback(
    async (role: "organizer" | "member" | "admin") => {
      const session = await exchangeLineToken(DEMO_TOKENS[role]);
      if (session) {
        const next: User = {
          ...session.user,
          role: role === "admin" ? "admin" : session.user.role,
        };
        storeUser(next);
        setUser(next);
        return next;
      }
      const fallback = enterDemoAs(role);
      setUser(fallback);
      return fallback;
    },
    [],
  );

  const logout = useCallback(() => {
    storeUser(null);
    setAccessToken(undefined);
    setUser(null);
  }, []);

  return { user, ready, error, demoLogin, logout, isDemo: isDemoMode() };
}
