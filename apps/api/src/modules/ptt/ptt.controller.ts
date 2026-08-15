import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PttService } from './ptt.service';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';

/**
 * PTT endpoints (feature-flagged). Production SFU: LiveKit.
 */
@ApiTags('ptt')
@ApiBearerAuth()
@Controller('v1/trips/:id/ptt')
export class PttController {
  constructor(private readonly ptt: PttService) {}

  @Post('token')
  @ApiOperation({
    summary: 'Issue mock LiveKit-style PTT room token (PTT_ENABLED)',
  })
  token(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ptt.issueToken(id, user.userId);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Request PTT floor (stub)' })
  hold(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ptt.holdFloor(id, user.userId);
  }

  @Post('release')
  @ApiOperation({ summary: 'Release PTT floor (stub)' })
  release(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ptt.releaseFloor(id, user.userId);
  }
}
