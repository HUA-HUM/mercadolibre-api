import { AxiosError, AxiosHeaders } from 'axios';
import { BadGatewayException } from '@nestjs/common';
import { MeliHttpErrorHandler, MeliRateLimitException } from './meliHttpError';

const axiosError = (status: number, headers: Record<string, string> = {}) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    undefined,
    {
      url: '/visits/items?ids=MLA1',
      method: 'get',
      headers: new AxiosHeaders(),
    },
    undefined,
    {
      status,
      statusText: '',
      data: { message: 'Too many requests' },
      headers,
      config: { headers: new AxiosHeaders() },
    },
  );

describe('MeliHttpErrorHandler', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('maps a 429 to MeliRateLimitException using Retry-After', () => {
    try {
      MeliHttpErrorHandler.handle(axiosError(429, { 'retry-after': '12' }));
      fail('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MeliRateLimitException);
      expect((error as MeliRateLimitException).getStatus()).toBe(429);
      expect((error as MeliRateLimitException).retryAfterSeconds).toBe(12);
    }
  });

  it('defaults Retry-After to 60s when Mercado Libre does not send it', () => {
    try {
      MeliHttpErrorHandler.handle(axiosError(429));
      fail('expected to throw');
    } catch (error) {
      expect((error as MeliRateLimitException).retryAfterSeconds).toBe(60);
    }
  });

  it('logs a 429 in a single line', () => {
    expect(() => MeliHttpErrorHandler.handle(axiosError(429))).toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect((console.warn as jest.Mock).mock.calls[0]).toHaveLength(1);
  });

  it('maps a 5xx to BadGatewayException', () => {
    expect(() => MeliHttpErrorHandler.handle(axiosError(503))).toThrow(
      BadGatewayException,
    );
  });

  it('returns null for 404', () => {
    expect(MeliHttpErrorHandler.handle(axiosError(404))).toBeNull();
  });
});
