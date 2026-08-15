import type { Locale } from "./i18n/strings";
import type { Trip } from "./types";

export type RouteBriefing = {
  expressway: string;
  toll: string;
  pass: string;
  radio: string;
  pit: string;
};

/** Bangkok club briefing: ทางด่วน กทพ. uses Easy Pass; M-Flow is motorway-only. */
const BANGKOK_INNER: Record<Locale, RouteBriefing> = {
  th: {
    expressway: "ทางพิเศษเฉลิมมหานคร / ศรีรัช",
    toll: "ด่านดินแดง — ช่อง Easy Pass ชิดขวา ห้ามตัดเข้าช่องเงินสด",
    pass: "Easy Pass (กทพ.) · M-Flow ใช้บนมอเตอร์เวย์ ไม่ใช่ทางด่วนนี้",
    radio: "ตามรถนำ · ไม่แซงในขบวน · ไม่แข่งความเร็ว",
    pit: "พักตามโน้ตหัวขบวน — เติม Easy Pass ก่อนออก",
  },
  en: {
    expressway: "Chalerm Mahanakhon / Si Rat expressway",
    toll: "Din Daeng plaza — Easy Pass lanes on the right; do not cut into cash",
    pass: "Easy Pass (EXAT). M-Flow is motorway-only — not this expressway.",
    radio: "Follow the lead car. No overtaking the convoy. Never race.",
    pit: "Fuel per organizer notes — top up Easy Pass before rollout",
  },
};

export function routeBriefing(trip: Trip, locale: Locale): RouteBriefing {
  const dest = trip.destination;
  const bangkok =
    dest && dest.lat > 13.5 && dest.lat < 14.0 && dest.lng > 100.3 && dest.lng < 100.8;
  if (bangkok) return BANGKOK_INNER[locale];
  return BANGKOK_INNER[locale];
}

export function briefingLine(briefing: RouteBriefing, locale: Locale): string {
  return locale === "th"
    ? `${briefing.toll.split("—")[0].trim()} · Easy Pass`
    : `${briefing.toll.split("—")[0].trim()} · Easy Pass`;
}
