const KEY = "mcg.oa.reminders";

export type ReminderSlot = "t24h" | "t30m" | "t5m";

export type TripReminder = {
  tripId: string;
  slot: ReminderSlot;
  fireAt: string;
  createdAt: string;
};

const OFFSETS: Record<ReminderSlot, number> = {
  t24h: 24 * 60 * 60_000,
  t30m: 30 * 60_000,
  t5m: 5 * 60_000,
};

function readAll(): TripReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = JSON.parse(raw || "[]") as Array<TripReminder | { tripId: string; fireAt: string; createdAt: string }>;
    return parsed.map((r) =>
      "slot" in r
        ? r
        : { ...r, slot: "t30m" as const },
    );
  } catch {
    return [];
  }
}

function writeAll(items: TripReminder[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

/** Clinic OA pattern: 24h + 30m + 5m. Bot nags, not หัวขบวน. */
export function scheduleClinicStack(
  tripId: string,
  targetArrivalAt: string,
): TripReminder[] {
  const target = new Date(targetArrivalAt).getTime();
  const now = Date.now();
  const createdAt = new Date().toISOString();
  const next = (Object.keys(OFFSETS) as ReminderSlot[]).map((slot, i) => {
    const preferred = target - OFFSETS[slot];
    return {
      tripId,
      slot,
      fireAt: new Date(Math.max(now + 8_000 * (i + 1), preferred)).toISOString(),
      createdAt,
    };
  });
  writeAll([...readAll().filter((r) => r.tripId !== tripId), ...next]);
  return next;
}

/** @deprecated use scheduleClinicStack — kept for older lobby calls */
export function scheduleT30(
  tripId: string,
  targetArrivalAt: string,
): TripReminder {
  return scheduleClinicStack(tripId, targetArrivalAt)[1] ?? {
    tripId,
    slot: "t30m",
    fireAt: new Date(Date.now() + 15_000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export function listReminders(tripId: string): TripReminder[] {
  return readAll()
    .filter((r) => r.tripId === tripId)
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}

export function getReminder(tripId: string): TripReminder | null {
  return listReminders(tripId)[0] ?? null;
}
