import {
  Body,
  Controller,
  Post,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { LineExchangeRequestSchema } from '@mcg-convoy/shared';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('line/exchange')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange LINE id_token (or demo token) for session',
  })
  async exchange(
    @Body(new ZodValidationPipe(LineExchangeRequestSchema))
    body: { idToken: string; nonce?: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const session = await this.auth.exchangeLine(body.idToken, body.nonce);
    const cookieName =
      this.config.get<string>('SESSION_COOKIE_NAME') ?? 'mcg_session';
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    void res.setCookie(cookieName, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure,
      maxAge: 7 * 24 * 60 * 60,
    });
    return session;
  }
}
