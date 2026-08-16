import { describe, expect, it, vi } from 'vitest';
import { LineService } from '../src/modules/line/line.service';
import { MarshalService } from '../src/modules/line/marshal.service';
import { MemoryStore } from '../src/infrastructure/memory/memory.store';

const DEMO_TRIP = '44444444-4444-4444-8444-444444444444';

function makeClient() {
  return {
    enabled: false,
    reply: vi.fn().mockResolvedValue(undefined),
    pushText: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
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
          text: expect.stringContaining('พี่นำขบวน'),
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

  it('explains the format when ผูกขบวน has no code', async () => {
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
          text: expect.stringContaining('รหัส'),
        }),
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
