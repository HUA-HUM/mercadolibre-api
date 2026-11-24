import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InternalApiKeyGuard } from './InternalApiKeyGuard';
import { Public } from './Public.decorator';

class PrivateController {
  handler() {}
}

@Public()
class PublicController {
  handler() {}
}

const contextWithHeaders = (
  headers: Record<string, unknown>,
  controller: new () => { handler: () => void } = PrivateController,
) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getHandler: () => controller.prototype.handler,
    getClass: () => controller,
  }) as unknown as ExecutionContext;

describe('InternalApiKeyGuard', () => {
  const guard = new InternalApiKeyGuard(new Reflector());

  it('allows @Public() endpoints without a key', () => {
    expect(guard.canActivate(contextWithHeaders({}, PublicController))).toBe(
      true,
    );
  });

  beforeEach(() => {
    process.env.INTERNAL_API_KEY = 'secret-key';
  });

  it('allows a request with the correct key', () => {
    expect(
      guard.canActivate(
        contextWithHeaders({ 'x-internal-api-key': 'secret-key' }),
      ),
    ).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong key, including one of different length', () => {
    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-internal-api-key': 'nope' })),
    ).toThrow(UnauthorizedException);
  });
});
