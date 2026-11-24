import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalApiKeyGuard } from './InternalApiKeyGuard';

const contextWithHeaders = (headers: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

describe('InternalApiKeyGuard', () => {
  const guard = new InternalApiKeyGuard();

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
