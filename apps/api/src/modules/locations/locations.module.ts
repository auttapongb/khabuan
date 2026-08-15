import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { EtaModule } from '../eta/eta.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [EtaModule, RealtimeModule],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
