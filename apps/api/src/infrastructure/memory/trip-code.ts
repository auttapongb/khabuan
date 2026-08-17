/**
 * Memorable trip codes: `DDMMYYYY-XX` (e.g. "17082026-AA").
 *
 * The date part is the Bangkok creation date; the two-letter suffix is a
 * running counter within that day (AA, AB, … AZ, BA, …), so codes are short,
 * human-typable, and self-describing (you can tell when the convoy was made).
 */

/** Asia/Bangkok is UTC+7 with no DST. */
export const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** "17082026" — the Bangkok date (DDMMYYYY). */
export function tripCodeDate(d: Date): string {
  const bkk = new Date(d.getTime() + BKK_OFFSET_MS);
  const dd = String(bkk.getUTCDate()).padStart(2, '0');
  const mm = String(bkk.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = bkk.getUTCFullYear();
  return `${dd}${mm}${yyyy}`;
}

/** "AA", "AB", … "AZ", "BA", … — a running two-letter suffix (base-26). */
export function tripCodeSuffix(n: number): string {
  const base = 26;
  const first = Math.floor(n / base) % base;
  const second = n % base;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

/**
 * The next memorable code, unique within the day. Counts existing codes that
 * share today's date prefix and appends the next suffix (AA, AB, …). Yields up
 * to 676 (AA–ZZ) distinct codes per day before wrapping — far beyond a car club.
 */
export function nextTripCode(
  existingCodes: Iterable<string | null | undefined>,
  now: Date = new Date(),
): string {
  const prefix = tripCodeDate(now);
  let count = 0;
  for (const code of existingCodes) {
    if (code && code.startsWith(prefix)) count++;
  }
  return `${prefix}-${tripCodeSuffix(count)}`;
}
