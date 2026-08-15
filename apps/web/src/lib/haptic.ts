export function tapHaptic(ms = 12): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
