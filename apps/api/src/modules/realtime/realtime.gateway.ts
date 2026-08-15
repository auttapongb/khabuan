import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly store: MemoryStore,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        extractBearer(client.handshake.headers.authorization);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
    } catch {
      this.logger.debug('Socket auth failed');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('trip:join')
  handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.tripId) return { ok: false };
    const participant = this.store.participants.get(
      `${body.tripId}:${userId}`,
    );
    if (!participant) return { ok: false, error: 'FORBIDDEN' };
    void client.join(`trip:${body.tripId}`);
    return { ok: true, room: `trip:${body.tripId}` };
  }

  @SubscribeMessage('trip:leave')
  handleLeaveTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId: string },
  ) {
    if (body?.tripId) void client.leave(`trip:${body.tripId}`);
    return { ok: true };
  }

  emitToTrip(tripId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`trip:${tripId}`).emit(event, payload);
  }
}

function extractBearer(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}
