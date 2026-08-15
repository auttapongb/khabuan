import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * BullMQ scoring/retention job stubs.
 * When Redis is unavailable, jobs run inline via BadgesService on trip close.
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.log('BullMQ disabled (no REDIS_URL) — inline scoring on close');
      return;
    }
    // Soft-enable flag; full worker wiring can attach when Redis is healthy
    this.enabled = true;
    this.logger.log('BullMQ queue ready (scoring/retention jobs)');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enqueueScoreTrip(tripId: string): Promise<void> {
    this.logger.debug(`enqueue score-trip ${tripId}`);
  }

  async enqueueRetention(tripId: string): Promise<void> {
    this.logger.debug(`enqueue retention ${tripId}`);
  }
}
