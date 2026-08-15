import { Module } from '@nestjs/common';
import { ContinuationsService } from './continuations.service';
import { ContinuationsController } from './continuations.controller';

@Module({
  controllers: [ContinuationsController],
  providers: [ContinuationsService],
})
export class ContinuationsModule {}
