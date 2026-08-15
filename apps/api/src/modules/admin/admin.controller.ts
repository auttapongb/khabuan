import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('trips')
  @ApiOperation({ summary: 'List trips' })
  trips() {
    return this.admin.listTrips();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  users() {
    return this.admin.listUsers();
  }

  @Get('vehicle-icons')
  @ApiOperation({ summary: 'Vehicle icon catalog' })
  icons() {
    return this.admin.listVehicleIcons();
  }

  @Get('audit')
  @ApiOperation({ summary: 'Recent audit events' })
  audit(@Query('limit') limit?: string) {
    return this.admin.listAudit(limit ? Number(limit) : 50);
  }

  @Post('invites/:id/revoke')
  @ApiOperation({ summary: 'Revoke invite' })
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.admin.revokeInvite(id, user.userId);
  }
}
