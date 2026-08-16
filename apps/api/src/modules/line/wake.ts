export type WakeKind = 'status' | 'brief' | 'share' | 'remind' | 'help' | 'log';
export type WakeMode = 'group' | 'dm';

const GROUP_WAKE = /#ขบวน|#convoy|ขบวน|mcg\s*convoy/i;
const LOG =
  /รถนำออก|ออกแล้ว|พักปั๊ม|ถึงด่าน|ถึงจุดนัด|ถึงอนุสาวรีย์|ปิดท้ายถึง|ถึงแล้ว|fuel stop|lead (is )?out/i;

export type WakeHit = {
  kind: WakeKind;
  logged?: string;
};

export function parseWake(
  text: string,
  mode: WakeMode = 'dm',
): WakeHit | null {
  const t = text.trim();
  if (!t) return null;
  if (mode === 'group' && !GROUP_WAKE.test(t)) return null;

  if (LOG.test(t)) return { kind: 'log', logged: t };
  if (/บรีฟ|brief|ด่าน|toll|easy\s*pass/i.test(t)) return { kind: 'brief' };
  if (/เตือน|remind/i.test(t)) return { kind: 'remind' };
  if (/แชร์|share|เชิญ|invite/i.test(t)) return { kind: 'share' };
  if (/สถานะ|status|ถึงไหน|เช็คขบวน|เช็คสถานะ/i.test(t)) return { kind: 'status' };
  if (mode === 'group' || GROUP_WAKE.test(t)) return { kind: 'help' };
  return null;
}

export function inferMode(event: unknown): WakeMode {
  if (!event || typeof event !== 'object') return 'dm';
  const source = (event as { source?: { type?: string } }).source?.type;
  return source === 'group' || source === 'room' ? 'group' : 'dm';
}
