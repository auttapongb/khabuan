import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitesService } from './invites.service';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('invites')
@Controller('v1/invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Resolve invite token to trip summary (public)',
  })
  resolve(@Param('token') token: string) {
    return this.invites.resolve(token);
  }
}
