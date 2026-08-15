import { Module } from '@nestjs/common';
import { PttService } from './ptt.service';
import { PttController } from './ptt.controller';

@Module({
  controllers: [PttController],
  providers: [PttService],
  exports: [PttService],
})
export class PttModule {}
