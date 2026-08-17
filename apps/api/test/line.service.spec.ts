import { describe, expect, it, vi } from 'vitest';
import { LineService } from '../src/modules/line/line.service';
import { MarshalService } from '../src/modules/line/marshal.service';
import { MemoryStore } from '../src/infrastructure/memory/memory.store';
import { nextTripCode, tripCodeDate } from '../src/infrastructure/memory/trip-code';

const DEMO_TRIP = '44444444-4444-4444-8444-444444444444';

function makeClient() {
  return {
    enabled: false,
    reply: vi.fn().mockResolvedValue(undefined),
    pushText: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    getProfile: vi.fn().mockResolvedValue(null),
    quickReply: vi.fn().mockImplementation((labels: string[]) => ({
      items: labels.map((label: string) => ({
        type: 'action',
        action: { type: 'message', label, text: label },
      })),
    })),
  };
}

function makeLineService() {
  // Respect ConfigService.get defaults (PERSISTENCE_MODE → 'memory').
  const config = { get: (_k: string, def?: unknown) => def ?? undefined };
  const store = new MemoryStore(config as never);
  store.onModuleInit(); // seed demo trip
  const client = makeClient();
  const marshal = new MarshalService(config as never, client as never);
  const svc = new LineService(config as never, marshal, client as never, store);
  return { store, client, svc };
}

describe('LineService — นำขบวน group bot', () => {
  it('generates memorable DDMMYYYY-XX trip codes', () => {
    const now = new Date(Date.UTC(2026, 7, 17, 5, 0)); // Bangkok 2026-08-17 12:00
    expect(tripCodeDate(now)).toBe('17082026');
    expect(nextTripCode([], now)).toBe('17082026-AA');
    expect(nextTripCode(['17082026-AA', '17082026-AB'], now)).toBe('17082026-AC');
    expect(nextTripCode(['16082026-ZZ'], now)).toBe('17082026-AA');
  });

  it('greets when added to a group (join event)', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [{ type: 'join', source: { type: 'group', groupId: 'g1' } }],
    });
    expect(client.push).toHaveBeenCalledWith(
      'g1',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('พี่มาแล้ว'),
        }),
      ]),
    );
  });

  it('binds a group via ผูกขบวน <tripId>', async () => {
    const { store, client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt1',
          message: { type: 'text', text: `ผูกขบวน ${DEMO_TRIP}` },
          source: { type: 'group', groupId: 'g2', userId: 'u1' },
        },
      ],
    });
    expect(store.trips.get(DEMO_TRIP)?.lineGroupId).toBe('g2');
    expect(client.reply).toHaveBeenCalled();
  });

  it('binds a group via short 6-char code prefix (locked format)', async () => {
    const { store, client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt-short',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g3', userId: 'u1' },
        },
      ],
    });
    expect(store.trips.get(DEMO_TRIP)?.lineGroupId).toBe('g3');
    expect(client.reply).toHaveBeenCalled();
  });

  it('records arrival when a member sends ถึงแล้ว in a bound group', async () => {
    const { store, svc } = makeLineService();
    // Bind demo trip to group g4.
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'b1',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g4', userId: 'u1' },
        },
      ],
    });
    // Member u2 reports arrival.
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'a1',
          message: { type: 'text', text: 'ถึงแล้ว' },
          source: { type: 'group', groupId: 'g4', userId: 'u2' },
        },
      ],
    });
    const uid = [...store.users.values()].find((u) => u.lineSubject === 'u2')!.id;
    const p = store.participants.get(`${DEMO_TRIP}:${uid}`);
    expect(p?.arrivalStatus).toBe('CONFIRMED');
    expect(p?.arrivedAt).toBeInstanceOf(Date);
  });

  it('accepts slash-prefixed commands (/ผูกขบวน 444444)', async () => {
    const { store, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 's1',
          message: { type: 'text', text: '/ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g5', userId: 'u1' },
        },
      ],
    });
    expect(store.trips.get(DEMO_TRIP)?.lineGroupId).toBe('g5');
  });

  it('warns when binding a trip already bound to another group', async () => {
    const { store, client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'c1',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g6', userId: 'u1' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'c2',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g7', userId: 'u1' },
        },
      ],
    });
    expect(store.trips.get(DEMO_TRIP)?.lineGroupId).toBe('g6');
    expect(client.reply).toHaveBeenLastCalledWith(
      'c2',
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('กรุ๊ปอื่น') }),
      ]),
    );
  });

  it('does not log arrival for negated phrases (ยังไม่ถึง)', async () => {
    const { store, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'b1',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'g8', userId: 'u1' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'n1',
          message: { type: 'text', text: 'ยังไม่ถึง' },
          source: { type: 'group', groupId: 'g8', userId: 'u2' },
        },
      ],
    });
    const uid = [...store.users.values()].find((u) => u.lineSubject === 'u2')?.id;
    const p = uid ? store.participants.get(`${DEMO_TRIP}:${uid}`) : undefined;
    expect(p?.arrivalStatus ?? 'NONE').toBe('NONE');
  });

  it('offers to create a convoy when ผูกขบวน has no trips yet', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt-bindhelp',
          message: { type: 'text', text: 'ผูกขบวน' },
          source: { type: 'group', groupId: 'g1', userId: 'u1' },
        },
      ],
    });
    expect(client.reply).toHaveBeenCalledWith(
      'rt-bindhelp',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('สร้างขบวน'),
        }),
      ]),
    );
  });

  it('creates a convoy through the chat flow (สร้างขบวน → name → destination → time)', async () => {
    const { store, client, svc } = makeLineService();
    // 1. start
    await svc.handleWebhookEvents({
      events: [
        { type: 'message', replyToken: 'c1', message: { type: 'text', text: 'สร้างขบวน' }, source: { type: 'user', userId: 'u9' } },
      ],
    });
    // 2. name
    await svc.handleWebhookEvents({
      events: [
        { type: 'message', replyToken: 'c2', message: { type: 'text', text: 'ไปเขาใหญ่' }, source: { type: 'user', userId: 'u9' } },
      ],
    });
    // 3. destination (location message)
    await svc.handleWebhookEvents({
      events: [
        { type: 'message', replyToken: 'c3', message: { type: 'location', latitude: 14.35, longitude: 101.37, address: 'เขาใหญ่' }, source: { type: 'user', userId: 'u9' } },
      ],
    });
    // 4. time
    await svc.handleWebhookEvents({
      events: [
        { type: 'message', replyToken: 'c4', message: { type: 'text', text: 'พรุ่งนี้ 9:00' }, source: { type: 'user', userId: 'u9' } },
      ],
    });

    // A trip was created with the given title + destination.
    const trips = [...store.trips.values()];
    const created = trips.find((t) => t.title === 'ไปเขาใหญ่');
    expect(created).toBeTruthy();
    expect(created?.destination).toEqual({ lat: 14.35, lng: 101.37 });
    // The final reply carried the code.
    expect(client.reply).toHaveBeenCalledWith(
      'c4',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('รหัสขบวน'),
        }),
      ]),
    );
  });

  it('explains that binding needs a group when ผูกขบวน <code> is sent in a DM', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt-dmbind',
          message: { type: 'text', text: 'ผูกขบวน 7E3D21' },
          source: { type: 'user', userId: 'u1' },
        },
      ],
    });
    expect(client.reply).toHaveBeenCalledWith(
      'rt-dmbind',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('กรุ๊ป'),
        }),
      ]),
    );
  });

  it('dedupes redelivered events by webhookEventId', async () => {
    const { client, svc } = makeLineService();
    const nameEvent = {
      type: 'message',
      replyToken: 'c2',
      webhookEventId: 'e-name',
      message: { type: 'text', text: 'ไปเขาใหญ่' },
      source: { type: 'user', userId: 'u9' },
    };
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'c1',
          webhookEventId: 'e-create',
          message: { type: 'text', text: 'สร้างขบวน' },
          source: { type: 'user', userId: 'u9' },
        },
      ],
    });
    await svc.handleWebhookEvents({ events: [nameEvent] });
    const callsAfterFirst = client.reply.mock.calls.length;
    await svc.handleWebhookEvents({ events: [nameEvent] }); // redelivered → skipped
    expect(client.reply.mock.calls.length).toBe(callsAfterFirst);
  });

  it('sends the destination pin when a member is lost', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'b1',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'gL', userId: 'u1' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'L1',
          message: { type: 'text', text: 'หลงทาง' },
          source: { type: 'group', groupId: 'gL', userId: 'u2' },
        },
      ],
    });
    expect(client.reply).toHaveBeenLastCalledWith(
      'L1',
      expect.arrayContaining([
        expect.objectContaining({ type: 'location' }),
        expect.objectContaining({ type: 'text' }),
      ]),
    );
  });

  it('records resume (back on track) as active sharing', async () => {
    const { store, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'b1',
          message: { type: 'text', text: 'ผูกขบวน 444444' },
          source: { type: 'group', groupId: 'gR', userId: 'u1' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r1',
          message: { type: 'text', text: 'หลงทาง' },
          source: { type: 'group', groupId: 'gR', userId: 'u2' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r2',
          message: { type: 'text', text: 'ไปต่อ' },
          source: { type: 'group', groupId: 'gR', userId: 'u2' },
        },
      ],
    });
    const uid = [...store.users.values()].find((u) => u.lineSubject === 'u2')?.id;
    const p = uid ? store.participants.get(`${DEMO_TRIP}:${uid}`) : undefined;
    expect(p?.sharingState).toBe('ACTIVE');
  });

  it('cancels the create flow with ยกเลิก', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'k1',
          message: { type: 'text', text: 'สร้างขบวน' },
          source: { type: 'user', userId: 'uX' },
        },
      ],
    });
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'k2',
          message: { type: 'text', text: 'ยกเลิก' },
          source: { type: 'user', userId: 'uX' },
        },
      ],
    });
    expect(client.reply).toHaveBeenLastCalledWith(
      'k2',
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('ยกเลิกการสร้างขบวน') }),
      ]),
    );
  });

  it('redirects status commands in a DM to the group', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'd1',
          message: { type: 'text', text: 'ถึงแล้ว' },
          source: { type: 'user', userId: 'uY' },
        },
      ],
    });
    expect(client.reply).toHaveBeenLastCalledWith(
      'd1',
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('กรุ๊ปขบวน') }),
      ]),
    );
  });

  it('replies to ถึงแล้ว in the group (chat-as-interface)', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt2',
          message: { type: 'text', text: 'ถึงแล้ว' },
          source: { type: 'group', groupId: 'g1', userId: 'u1' },
        },
      ],
    });
    expect(client.reply).toHaveBeenCalledWith(
      'rt2',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('ถึงแล้ว'),
        }),
      ]),
    );
  });

  it('stays silent on ordinary group chatter (ขุนทอง rule)', async () => {
    const { client, svc } = makeLineService();
    await svc.handleWebhookEvents({
      events: [
        {
          type: 'message',
          replyToken: 'rt3',
          message: { type: 'text', text: 'เจอกันที่ด่าน' },
          source: { type: 'group', groupId: 'g1', userId: 'u1' },
        },
      ],
    });
    expect(client.reply).not.toHaveBeenCalled();
  });
});
