import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ContinuationCreateRequestSchema,
  ContinuationRedeemRequestSchema,
} from '@mcg-convoy/shared';
import { ContinuationsService } from './continuations.service';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('continuations')
@ApiBearerAuth()
@Controller('v1/continuations')
export class ContinuationsController {
  constructor(private readonly continuations: ContinuationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create LIFF→browser continuation code' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ContinuationCreateRequestSchema))
    body: { tripId: string; returnUri: string; nonce: string },
  ) {
    return this.continuations.create(
      user.userId,
      body.tripId,
      body.returnUri,
      body.nonce,
    );
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem continuation code after LINE login' })
  redeem(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ContinuationRedeemRequestSchema))
    body: { code: string; nonce: string },
  ) {
    return this.continuations.redeem(user.userId, body.code, body.nonce);
  }
}
