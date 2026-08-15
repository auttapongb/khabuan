import {
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { LineService } from './line.service';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('line')
@Controller('v1/line')
export class LineController {
  constructor(private readonly line: LineService) {}

  @Public()
  @Post('webhook')
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('x-line-signature') signature: string | undefined,
  ) {
    const raw =
      req.rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}));
    if (!this.line.verifySignature(raw, signature)) {
      throw new UnauthorizedException('Invalid LINE signature');
    }
    return this.line.handleWebhookEvents(
      (req.body ?? {}) as { destination?: string; events?: unknown[] },
    );
  }
}
