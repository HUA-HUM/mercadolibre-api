import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

export const isValidInternalApiKey = (
  provided: unknown,
  expected: string,
): boolean =>
  typeof provided === 'string' &&
  timingSafeEqual(digest(provided), digest(expected));

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, unknown> }>();
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected) {
      throw new ServiceUnavailableException(
        'INTERNAL_API_KEY is not configured',
      );
    }

    const apiKey = request.headers['x-internal-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Internal API key missing');
    }

    if (!isValidInternalApiKey(apiKey, expected)) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
