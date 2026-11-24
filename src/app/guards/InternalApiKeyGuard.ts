import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY } from './Public.decorator';

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
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
