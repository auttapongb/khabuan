/**
 * พี่นำขบวน (Phi Nam Khabuan) — the convoy marshal persona.
 *
 * Friendly Thai message catalog, keyed by trigger. All messages obey the
 * persona tone rules:
 *   1. Never imply speed — celebrate ARRIVAL, never pace.
 *   2. Never rank-shame in the group — late stays private (DM).
 *   3. Frame wins as the GROUP (ขบวน), not the individual.
 *   4. Absorb the awkward chore (the "who's late" nag).
 *   5. Safety is the brand.
 *
 * Every `{token}` is substituted by MarshalService at runtime.
 */

export interface MarshalTemplate {
  /** Template with {placeholders}. */
  th: string;
  /** Short English gloss for the dev team (not user-facing). */
  en: string;
}

export const MARSHAL_TEMPLATES = {
  // ── Before (anticipation) ──────────────────────────────────────────────
  trip_created: {
    th: '📋 ทริป "{title}" พร้อมแล้ว! กี่คันมาเอ่ย? แตะ "🚗 มา" แล้วบอกชื่อรถกันหน่อย',
    en: 'Trip "{title}" is ready! How many cars? Tap "🚗 in" and tell us your car.',
  },
  roll_call: {
    th: 'เช็คชื่อขบวน! 🚗 ใครมาบ้าง แตะ "มา" ได้เลยน้า',
    en: 'Roll call! Who is coming? Tap "in".',
  },
  roll_call_reminder: {
    th: 'เหลือ {count} คันที่ยังไม่ตอบ — ขบวนรออยู่! 🚗',
    en: '{count} cars still haven\'t replied — the convoy is waiting!',
  },
  countdown_days: {
    th: 'เหลือ {days} วัน ถึงวันออกขบวน! ตรวจรถกันรึยัง? ⛽',
    en: '{days} days to go! Checked your car yet?',
  },
  checklist: {
    th: 'เช็กลิสต์ก่อนออกขบวน: น้ำมัน ⛽ · น้ำดื่ม 💧 · เงินค่าทางด่วน · เจอกัน {time} นะทุกคน',
    en: 'Pre-trip checklist: fuel ⛽ · water 💧 · toll money · meet at {time}.',
  },

  // ── During (departures) ────────────────────────────────────────────────
  first_departure: {
    th: '🚗 คันแรกออกตัวแล้ว! ขบวนพร้อมออก! ตามกันมาดี ๆ นะ',
    en: 'First car departed! Convoy, ready to roll — follow safely.',
  },
  departure: {
    th: '🚗 ออกตัวแล้ว {departed} คัน เหลืออีก {remaining} คัน — รอครบแล้วค่อยออกขบวนนะ',
    en: '{departed} departed, {remaining} to go — we roll when everyone is ready.',
  },

  // ── During (arrivals) ──────────────────────────────────────────────────
  arrival: {
    th: '🏁 คันที่ {n} เข้าเส้นชัย — เป๊ะ! ถึงแล้วปลอดภัยดีมาก',
    en: 'Car #{n} crossed the line — spot on! Safe arrival.',
  },
  progress_halfway: {
    th: 'ขบวนถึงครึ่งทางแล้ว ทุกคันปลอดภัยดี ✅',
    en: 'Convoy halfway, everyone safe ✅',
  },

  // ── The gentle nag (KhunThong move) ────────────────────────────────────
  nag_group: {
    th: 'เหลือ {remaining} คันกำลังมา ETA ~{eta} นาที — ไม่ต้องรีบนะ ขับปลอดภัย 😊',
    en: '{remaining} cars still coming, ETA ~{eta} min — no rush, drive safe 😊',
  },
  nag_dm: {
    th: 'ถึงช้าไม่เป็นไรเลยนะ แต่บอกพี่นำขบวนหน่อยว่าปลอดภัย 💙',
    en: 'Running late is totally fine — just tell me you\'re safe 💙',
  },

  // ── During (pit stop / lost) ───────────────────────────────────────────
  pit_stop: {
    th: '⛽ มีคันแวะพักปั๊ม ขบวนรออยู่ — ปลอดภัยไว้ก่อน',
    en: 'A car is at a pit stop — convoy is waiting. Safety first.',
  },
  lost: {
    th: '📍 พี่นำขบวนส่งจุดนัดหมายที่ใกล้สุดให้แล้ว ตามไปเจอกันตรงนั้นนะ ไม่ต้องตกใจ 😊',
    en: '📍 I sent the nearest meeting point — meet there, don\'t worry 😊',
  },

  // ── After (celebration / payoff) ───────────────────────────────────────
  all_arrived: {
    th: '🎉 ขบวนถึงครบ 100%! วันนี้เป๊ะมากทุกคน ภูมิใจสุด ๆ!',
    en: '🎉 Convoy 100% arrived! Today was spot on — so proud!',
  },
  badge_drop: {
    th: '🏅 "{badge}" ตกเป็นของ {name} — {reason}!',
    en: '🏅 "{badge}" goes to {name} — {reason}!',
  },
  streak: {
    th: '🔥 {club} ถึงตรงเวลา {streak} ทริปติด! ขบวนนี้น่าเชื่อถือสุด ๆ',
    en: '🔥 {club} on time {streak} trips straight — the most reliable crew!',
  },
  trip_recap: {
    th: '📸 สรุปทริป "{title}" พร้อมแล้ว — ระยะทาง {distance} กม. · เวลา {duration} ชม. · ถึงครบ {count} คัน',
    en: '📸 Trip "{title}" recap ready — {distance}km · {duration}h · {count} cars arrived.',
  },

  // ── Chat-as-interface command confirmations ────────────────────────────
  arrived_confirm: {
    th: '🏁 ถึงแล้ว! พี่นำขบวนลงบันทึกให้แล้ว ปลอดภัยดีมาก',
    en: '🏁 Arrived! I logged it — great to see you safe.',
  },
  departed_confirm: {
    th: '🚗 ออกตัวแล้ว! ขบวนจะรอครบทุกคันนะ',
    en: '🚗 Departed! The convoy will wait for everyone.',
  },
  pitstop_confirm: {
    th: '⛽ แวะพักปั๊ม — ลงบันทึกให้แล้ว ขับต่อเมื่อพร้อมนะ',
    en: '⛽ Pit stop logged — continue when ready.',
  },
  lost_help: {
    th: '📍 ไม่เป็นไร! นี่จุดนัดหมายที่ใกล้สุด — ตามไปเลย ปลอดภัยไว้ก่อน',
    en: '📍 No worries! Here\'s the nearest meeting point — head there, safety first.',
  },
  status_reply: {
    th: 'สถานะขบวนตอนนี้: ถึงแล้ว {arrived} · ระหว่างทาง {enroute} · ออกตัว {departed}',
    en: 'Convoy status: {arrived} arrived · {enroute} en route · {departed} departed.',
  },
  join_greeting: {
    th: 'สวัสดีทุกคน! พี่นำขบวนมาแล้ว 🚗\nพี่จะช่วยดูแลขบวนนี้ — แตะปุ่มด้านล่างหรือพิมพ์คำสั่งได้เลยน้า\nหัวหน้าขบวนพิมพ์ "ผูกขบวน <รหัสทริป>" เพื่อเริ่ม',
    en: 'Hi everyone! I\'m here 🚗\nTap the buttons below or type a command.\nOrganizer: send "bind <trip id>" to get started.',
  },
  bind_confirm: {
    th: '🎉 ผูกขบวนสำเร็จ!\nต่อไปนี้พี่นำขบวนจะคอยรายงานสถานะให้ — สมาชิกพิมพ์ "ถึงแล้ว" ตอนถึงปลายทางได้เลย 🏁',
    en: '🎉 Convoy bound!\nI\'ll report status from here — members type "arrived" at the destination 🏁',
  },
  help_menu: {
    th: 'พี่นำขบวนช่วยได้นะ 🚗\n• "ผูกขบวน <รหัส>" — ผูกกรุ๊ปนี้กับทริป\n• "ถึงแล้ว" — ลงบันทึกว่าถึงปลายทาง\n• "ออกตัว" — ลงบันทึกว่าออกเดินทาง\n• "แวะปั๊ม" — แจ้งพักปั๊มน้ำมัน\n• "หลงทาง" — ขอจุดนัดหมาย\n• "เช็คขบวน" — ดูสถานะขบวนตอนนี้',
    en: 'I can help 🚗\n• "bind <trip id>" — link this group to a trip\n• "arrived" / "departed" / "pit stop" / "lost" — log status\n• "check" — convoy status',
  },
  bind_help: {
    th: 'ผูกขบวนแบบนี้เลยน้า 👇\n"ผูกขบวน <รหัส>"\nตัวอย่าง: ผูกขบวน 444444\n(รหัส 6 ตัว — ดูได้ในแอพนำขบวน หน้ารายละเอียดทริป)',
    en: 'Bind like this 👇\n"bind <code>"\nExample: bind 444444\n(the 6-char code is in the Khabuan app, on the trip page)',
  },
  bind_not_found: {
    th: 'หารหัสนี้ไม่เจอน้า 🤔 ลองเช็ครหัส 6 ตัวอีกที หรือดูได้ในแอพนำขบวน',
    en: 'Couldn\'t find that code 🤔 Double-check the 6-char code, or find it in the Khabuan app.',
  },
  not_bound: {
    th: 'ยังไม่ผูกขบวนเลยน้า — ส่ง "ผูกขบวน <รหัสทริป>" ก่อน แล้วพี่นำขบวนจะดูแลให้ 😊',
    en: 'No convoy bound yet — send "bind <trip id>" first and I\'ll take over 😊',
  },
  create_start: {
    th: 'ได้เลย! มาเริ่มสร้างขบวนกัน 🚗\nชื่อทริปอะไรดี? (พิมพ์ชื่อเลย)',
    en: "Sure! Let's create a convoy 🚗\nWhat's the trip name? (just type it)",
  },
  create_ask_destination: {
    th: 'สุดยอด! ปลายทางอยู่ไหน? 📍\nกด "แชร์ตำแหน่ง" หรือพิมพ์ชื่อสถานที่ก็ได้',
    en: 'Nice! Where is the destination? 📍\nTap "Share location" or type a place name.',
  },
  create_ask_time: {
    th: 'แล้วนัดหมายวันเวลาอะไรดี? ⏰\nเช่น "พรุ่งนี้ 9:00" หรือ "25/8 9:00"',
    en: 'What date & time? ⏰\ne.g. "tomorrow 9:00" or "25/8 9:00"',
  },
  create_done: {
    th: '🎉 สร้างขบวน "{title}" แล้ว!\nรหัสขบวน: {code}\nเพิ่มพี่นำขบวนเข้ากรุ๊ป แล้วพิมพ์ "ผูกขบวน {code}" เพื่อผูกได้เลย',
    en: '🎉 Convoy "{title}" created!\nCode: {code}\nAdd me to the group, then send "bind {code}".',
  },
  my_trips_none: {
    th: 'ยังไม่มีขบวนของตัวเองเลยน้า — สร้างก่อนด้วย "สร้างขบวน" 🚗',
    en: 'You don\'t have a convoy yet — create one first with "create".',
  },
  bind_pick: {
    th: 'เลือกขบวนที่อยากผูกกับกรุ๊ปนี้เลย 👇',
    en: 'Pick which convoy to bind to this group 👇',
  },
  create_cancelled: {
    th: 'โอเค ยกเลิกการสร้างขบวนแล้ว — เริ่มใหม่เมื่อไหร่บอกได้เลย 😊',
    en: 'Okay, cancelled. Start again whenever you like 😊',
  },

  // ── Badge display names (Thai friendly) ────────────────────────────────
  badge_names: {
    EARLY_BIRD: { th: 'นกตื่นเช้า', en: 'Early Bird' },
    ON_TIME: { th: 'ตรงเวลาเป๊ะ', en: 'Spot-on Time' },
    JUST_IN_TIME: { th: 'ทันเวลาพอดี', en: 'Just in Time' },
    LATE_ARRIVAL: { th: 'มาช้าแต่ปลอดภัย', en: 'Late but Safe' },
    RELIABLE_CRUISER: { th: 'นักเดินทางผู้วางใจได้', en: 'Reliable Cruiser' },
    ROAD_CAPTAIN: { th: 'หัวหน้าขบวน', en: 'Road Captain' },
    SAFETY_FIRST: { th: 'ปลอดภัยไว้ก่อน', en: 'Safety First' },
  },
} as const;

export type MarshalTemplateKey = keyof typeof MARSHAL_TEMPLATES;

/** Badge enum → friendly Thai label. */
export function badgeLabel(type: string): string {
  const map = (MARSHAL_TEMPLATES.badge_names as Record<string, MarshalTemplate>);
  return map[type]?.th ?? type;
}

/** Badge enum → friendly Thai reason (for the badge-drop line). */
export function badgeReason(type: string): string {
  const map: Record<string, string> = {
    EARLY_BIRD: 'มาถึงก่อนเวลา 10–30 นาที',
    ON_TIME: 'ถึงตรงเวลาเป๊ะ',
    JUST_IN_TIME: 'ทันช่วงเวลาพอดี',
    LATE_ARRIVAL: 'ถึงช้าแต่ปลอดภัย',
    RELIABLE_CRUISER: 'ตรงเวลา 3 ทริปติด',
    ROAD_CAPTAIN: 'ขบวนถึงครบ 80% ขึ้นไป',
    SAFETY_FIRST: 'ปิดแชร์และยืนยันถึงปลายทาง',
  };
  return map[type] ?? type;
}
