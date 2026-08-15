import { describe, expect, it } from 'vitest';
import { inferMode, parseWake } from '../src/modules/line/wake';

describe('LINE wake parser', () => {
  it('stays silent on ordinary group chat (ขุนทอง rule)', () => {
    expect(parseWake('ถึงไหนแล้ว', 'group')).toBeNull();
    expect(parseWake('เจอกันที่ด่าน', 'group')).toBeNull();
    expect(parseWake('', 'group')).toBeNull();
  });

  it('wakes on #ขบวน in a group and routes the job', () => {
    expect(parseWake('#ขบวน', 'group')?.kind).toBe('help');
    expect(parseWake('#ขบวน สถานะ', 'group')?.kind).toBe('status');
    expect(parseWake('#ขบวน บรีฟ', 'group')?.kind).toBe('brief');
    expect(parseWake('#ขบวน เตือน', 'group')?.kind).toBe('remind');
    expect(parseWake('#ขบวน แชร์', 'group')?.kind).toBe('share');
    expect(parseWake('#convoy status', 'group')?.kind).toBe('status');
  });

  it('accepts natural 1:1 chat like ป้านวล (no hash)', () => {
    expect(parseWake('ถึงไหนแล้ว', 'dm')?.kind).toBe('status');
    expect(parseWake('รถนำออกแล้ว', 'dm')?.kind).toBe('log');
    expect(parseWake('พักปั๊ม', 'dm')?.kind).toBe('log');
    expect(parseWake('กินกาแฟ 80', 'dm')).toBeNull();
  });

  it('treats LINE group source as group mode', () => {
    expect(inferMode({ source: { type: 'group' } })).toBe('group');
    expect(inferMode({ source: { type: 'user' } })).toBe('dm');
  });
});
