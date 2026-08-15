import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (this.config.get('PERSISTENCE_MODE') !== 'prisma') {
      this.logger.log('Prisma disabled (PERSISTENCE_MODE != prisma)');
      return;
    }
    try {
      await this.$connect();
      this.enabled = true;
      this.logger.log('Prisma connected');
    } catch (err) {
      this.logger.warn(
        `Prisma connect failed — falling back to memory: ${(err as Error).message}`,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.enabled) await this.$disconnect();
  }
}
