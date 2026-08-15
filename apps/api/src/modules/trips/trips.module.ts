import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { LocationsModule } from '../locations/locations.module';
import { BadgesModule } from '../badges/badges.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [LocationsModule, BadgesModule, RealtimeModule, LineModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
