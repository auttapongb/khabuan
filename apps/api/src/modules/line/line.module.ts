import { Module } from '@nestjs/common';
import { LineService } from './line.service';
import { LineController } from './line.controller';
import { MarshalService } from './marshal.service';

@Module({
  controllers: [LineController],
  providers: [LineService, MarshalService],
  exports: [LineService, MarshalService],
})
export class LineModule {}
