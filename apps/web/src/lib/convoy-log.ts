const KEY = "mcg.convoy.log";

export type LogKind = "lead" | "pit" | "plaza" | "arrive" | "share" | "note";

export type ConvoyNote = {
  id: string;
  tripId: string;
  text: string;
  kind: LogKind;
  at: string;
};

function readAll(): ConvoyNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConvoyNote[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ConvoyNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
}

/** ป้านวล auto-category — map a sentence to a convoy slot. */
export function classifyLog(text: string): LogKind {
  const t = text.trim();
  if (/รถนำออก|lead (is )?out|ออกแล้ว/i.test(t)) return "lead";
  if (/พักปั๊ม|fuel|pit/i.test(t)) return "pit";
  if (/ถึงด่าน|ด่าน|plaza|easy\s*pass/i.test(t)) return "plaza";
  if (/ถึงแล้ว|ถึงจุดนัด|ถึงอนุสาวรีย์|ปิดท้ายถึง|arrived/i.test(t)) return "arrive";
  if (/แชร์ตำแหน่ง|start sharing|sharing on/i.test(t)) return "share";
  return "note";
}

export function addNote(tripId: string, text: string, kind?: LogKind): ConvoyNote {
  const note: ConvoyNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tripId,
    text: text.trim(),
    kind: kind ?? classifyLog(text),
    at: new Date().toISOString(),
  };
  writeAll([note, ...readAll()]);
  return note;
}

export function listNotes(tripId: string): ConvoyNote[] {
  return readAll().filter((n) => n.tripId === tripId);
}

export function undoLast(tripId: string): ConvoyNote | null {
  const all = readAll();
  const idx = all.findIndex((n) => n.tripId === tripId);
  if (idx < 0) return null;
  const [removed] = all.splice(idx, 1);
  writeAll(all);
  return removed ?? null;
}
