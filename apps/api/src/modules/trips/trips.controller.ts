import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CloseTripRequestSchema,
  ConfirmArrivalRequestSchema,
  CreateTripRequestSchema,
  JoinTripRequestSchema,
  LocationsBatchRequestSchema,
  SharingRequestSchema,
} from '@mcg-convoy/shared';
import { TripsService } from './trips.service';
import { LocationsService } from '../locations/locations.service';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('v1/trips')
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly locations: LocationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create trip' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateTripRequestSchema)) body: unknown,
  ) {
    return this.trips.create(
      user.userId,
      body as Parameters<TripsService['create']>[1],
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip summary' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.get(id, user.userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join trip via invite' })
  join(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(JoinTripRequestSchema)) body: unknown,
  ) {
    return this.trips.join(
      id,
      user.userId,
      body as Parameters<TripsService['join']>[2],
    );
  }

  @Post(':id/sharing')
  @ApiOperation({ summary: 'Start/pause/stop location sharing' })
  sharing(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(SharingRequestSchema)) body: unknown,
  ) {
    return this.trips.setSharing(
      id,
      user.userId,
      body as Parameters<TripsService['setSharing']>[2],
    );
  }

  @Post(':id/locations')
  @ApiOperation({ summary: 'Submit sequenced location batch' })
  locationsBatch(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(LocationsBatchRequestSchema)) body: unknown,
  ) {
    return this.locations.ingestBatch(
      id,
      user.userId,
      body as Parameters<LocationsService['ingestBatch']>[2],
    );
  }

  @Get(':id/locations')
  @ApiOperation({
    summary: 'Current participant locations with freshness',
  })
  locationsCurrent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.locations.listCurrent(id, user.userId);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Live stream subscription info (Socket.IO)' })
  stream(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.streamInfo(id, user.userId);
  }

  @Post(':id/arrivals/confirm')
  @ApiOperation({ summary: 'Confirm or dispute arrival' })
  confirmArrival(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ConfirmArrivalRequestSchema)) body: unknown,
  ) {
    const dto = body as {
      action: 'confirm' | 'dispute';
      reason?: string;
      arrivedAt?: string;
    };
    return this.trips.confirmArrival(
      id,
      user.userId,
      dto.action,
      dto.reason,
      dto.arrivedAt,
    );
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close trip and queue scoring' })
  close(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CloseTripRequestSchema)) body: unknown,
  ) {
    const dto = body as { reason?: string };
    return this.trips.close(id, user.userId, dto.reason);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open published trip (organizer)' })
  open(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.openTrip(id, user.userId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Trip badges and summary' })
  results(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.results(id, user.userId);
  }
}
