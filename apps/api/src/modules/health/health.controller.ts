import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/auth.decorators';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly store: MemoryStore,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness / readiness' })
  check() {
    return {
      status: 'ok',
      authMode: this.config.get('AUTH_MODE', 'demo'),
      persistenceMode: this.config.get('PERSISTENCE_MODE', 'memory'),
      prisma: this.prisma.isEnabled(),
      demo: {
        tripId: '44444444-4444-4444-8444-444444444444',
        inviteToken: this.store.demoInviteToken || undefined,
        inviteAliases: [...this.store.demoInviteAliases.keys()],
        clubId: '33333333-3333-4333-8333-333333333333',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
