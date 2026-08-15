import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.flatten(),
      });
    }
    return result.data;
  }
}
