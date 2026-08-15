import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { TripsModule } from './modules/trips/trips.module';
import { LocationsModule } from './modules/locations/locations.module';
import { EtaModule } from './modules/eta/eta.module';
import { BadgesModule } from './modules/badges/badges.module';
import { LineModule } from './modules/line/line.module';
import { AdminModule } from './modules/admin/admin.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';
import { ContinuationsModule } from './modules/continuations/continuations.module';
import { InvitesModule } from './modules/invites/invites.module';
import { PttModule } from './modules/ptt/ptt.module';
import { MemoryModule } from './infrastructure/memory/memory.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { AuthGuard } from './common/guards/auth.guard';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    MemoryModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    TripsModule,
    LocationsModule,
    EtaModule,
    BadgesModule,
    LineModule,
    AdminModule,
    RealtimeModule,
    HealthModule,
    ContinuationsModule,
    InvitesModule,
    PttModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
