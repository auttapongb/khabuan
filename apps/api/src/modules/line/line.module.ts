import { Module } from '@nestjs/common';
import { LineService } from './line.service';
import { LineController } from './line.controller';
import { LineClient } from './line-client';
import { MarshalService } from './marshal.service';

@Module({
  controllers: [LineController],
  providers: [LineService, LineClient, MarshalService],
  exports: [LineService, LineClient, MarshalService],
})
export class LineModule {}
