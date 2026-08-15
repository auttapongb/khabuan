import type { User } from "./types";

const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE || "demo") as
  | "demo"
  | "liff";
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

export const DEMO_USERS: Record<"organizer" | "member" | "admin", User> = {
  organizer: {
    id: "demo-organizer",
    displayName: "เอก",
    role: "organizer",
  },
  member: {
    id: "demo-member",
    displayName: "มิ้นท์",
    role: "member",
  },
  admin: {
    id: "demo-admin",
    displayName: "แอดมิน",
    role: "admin",
  },
};

const SESSION_KEY = "mcg.session.user";

export function isDemoMode(): boolean {
  return AUTH_MODE === "demo" || !LIFF_ID;
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function enterDemoAs(role: keyof typeof DEMO_USERS): User {
  const user = DEMO_USERS[role];
  storeUser(user);
  return user;
}

export async function initLiff(): Promise<{
  ready: boolean;
  profile?: { userId: string; displayName: string; pictureUrl?: string };
  idToken?: string | null;
  error?: string;
}> {
  if (isDemoMode()) {
    return { ready: true };
  }

  try {
    const liff = (await import("@line/liff")).default;
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return { ready: false };
    }
    const profile = await liff.getProfile();
    return {
      ready: true,
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      },
      idToken: liff.getIDToken(),
    };
  } catch (err) {
    return {
      ready: false,
      error: err instanceof Error ? err.message : "LIFF init failed",
    };
  }
}

export async function openExternalBrowser(url: string): Promise<void> {
  if (isDemoMode()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const liff = (await import("@line/liff")).default;
    if (liff.isInClient()) {
      liff.openWindow({ url, external: true });
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function shareTripInvite(
  url: string,
  title: string,
  flex?: unknown,
): Promise<void> {
  const message = flex
    ? [flex]
    : [{ type: "text" as const, text: `${title}\n${url}` }];

  if (isDemoMode()) {
    if (navigator.share) {
      await navigator.share({ title, url, text: title });
      return;
    }
    await navigator.clipboard.writeText(url);
    return;
  }
  try {
    const liff = (await import("@line/liff")).default;
    if (liff.isApiAvailable("shareTargetPicker")) {
      await liff.shareTargetPicker(message as never);
      return;
    }
  } catch {
    /* fall through */
  }
  await navigator.clipboard.writeText(url);
}
