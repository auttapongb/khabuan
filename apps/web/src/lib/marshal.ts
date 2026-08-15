"use client";

import { toast } from "sonner";

/**
 * พี่นำขบวน (Phi Nam Khabuan) — the convoy marshal persona.
 *
 * Shows a toast speaking as the marshal: Thai-first, warm, safety-conscious
 * (never "เร็ว"), and never rank-shaming (late stays private).
 *
 * The same persona lives server-side in `apps/api` (marshal-messages.ts); this
 * is the web-side surface that shows those messages as toasts.
 */
export function marshalToast(text: string): void {
  toast("🚗 พี่นำขบวน", {
    description: text,
    style: {
      background: "#1a1d21",
      border: "1px solid rgba(228, 207, 160, 0.35)",
      color: "#e6e9ee",
      fontFamily: "var(--font-body), Outfit, system-ui, sans-serif",
    },
  });
}

/** The celebration + badge drop, fired when a trip closes. */
export function celebrateConvoy(arrivedCount: number, badgeCount: number): void {
  marshalToast("🎉 ขบวนถึงครบ 100%! วันนี้เป๊ะมากทุกคน ภูมิใจสุด ๆ!");
  if (badgeCount > 0) {
    marshalToast(`🏅 แจกตรา ${badgeCount} รางวัลให้ลูกขบวนแล้ว — เก่งมาก!`);
  }
  if (arrivedCount > 0) {
    marshalToast(`📸 สรุปทริปพร้อมแล้ว — ถึงครบ ${arrivedCount} คัน`);
  }
}
