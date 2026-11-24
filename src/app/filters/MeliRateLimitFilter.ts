import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MeliRateLimitException } from 'src/core/drivers/repositories/mercadolibre/http/error/meliHttpError';

@Catch(MeliRateLimitException)
export class MeliRateLimitFilter implements ExceptionFilter {
  catch(exception: MeliRateLimitException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response
      .status(exception.getStatus())
      .setHeader('Retry-After', String(exception.retryAfterSeconds))
      .json(exception.getResponse());
  }
}
