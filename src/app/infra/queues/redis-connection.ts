import { RedisOptions } from 'bullmq';

const parseBoolean = (value?: string): boolean =>
  ['true', '1', 'yes'].includes((value ?? '').toLowerCase());

export const createRedisConnection = (): RedisOptions => {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT ?? 6379);

  if (!host) {
    throw new Error('REDIS_HOST is not defined');
  }

  return {
    host,
    port,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    tls: parseBoolean(process.env.REDIS_TLS) ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};
