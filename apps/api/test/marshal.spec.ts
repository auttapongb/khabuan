import { describe, expect, it } from 'vitest';
import { MarshalService } from '../src/modules/line/marshal.service';
import {
  MARSHAL_TEMPLATES,
  badgeLabel,
  type MarshalTemplate,
} from '../src/modules/line/marshal-messages';

const marshal = new MarshalService({ get: () => undefined } as never);

/** Every non-badge_names entry is a flat MarshalTemplate. */
function flatTemplates(): Array<[string, MarshalTemplate]> {
  return Object.entries(MARSHAL_TEMPLATES)
    .filter(([k]) => k !== 'badge_names')
    .map(([k, v]) => [k, v as MarshalTemplate]);
}

describe('พี่นำขบวน marshal persona', () => {
  it('renders arrival with the car order', () => {
    const m = marshal.arrival(3);
    expect(m.target).toBe('group');
    expect(m.text).toContain('คันที่ 3');
    expect(m.text).toContain('🏁');
  });

  it('renders the departure countdown', () => {
    const m = marshal.departure(3, 2, false);
    expect(m.text).toContain('ออกตัวแล้ว 3 คัน');
    expect(m.text).toContain('เหลืออีก 2');
  });

  it('keeps the late nag private (DM, never group)', () => {
    const nag = marshal.nagDm();
    expect(nag.target).toBe('dm');
    expect(nag.text).toContain('ปลอดภัย');
  });

  it('uses the Thai badge label in badge drop', () => {
    expect(badgeLabel('ROAD_CAPTAIN')).toBe('หัวหน้าขบวน');
    const m = marshal.badgeDrop('โต้ง', 'ROAD_CAPTAIN', 'ขบวนถึง 80% ตรงเวลา');
    expect(m.text).toContain('หัวหน้าขบวน');
    expect(m.text).toContain('โต้ง');
  });

  it('renders the trip recap with numbers', () => {
    const m = marshal.tripRecap('เขาใหญ่', 180, 3, 12);
    expect(m.text).toContain('180 กม.');
    expect(m.text).toContain('3 ชม.');
    expect(m.text).toContain('12 คัน');
  });

  it('tone rule: never mentions speed in any message', () => {
    for (const [key, tpl] of flatTemplates()) {
      expect(tpl.th, `template "${key}" must not imply speed`).not.toMatch(/เร็ว/);
    }
    for (const b of Object.values(
      MARSHAL_TEMPLATES.badge_names as Record<string, MarshalTemplate>,
    )) {
      expect(b.th).not.toMatch(/เร็ว/);
    }
  });

  it('tone rule: every template is friendly Thai (non-empty, has Thai chars)', () => {
    for (const [key, tpl] of flatTemplates()) {
      expect(tpl.th.length).toBeGreaterThan(5);
      expect(tpl.th, `template "${key}" should contain Thai`).toMatch(
        /[\u0E00-\u0E7F]/,
      );
    }
  });
});
