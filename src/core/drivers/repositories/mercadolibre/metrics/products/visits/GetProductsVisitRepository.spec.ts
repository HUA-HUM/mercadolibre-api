import { BadGatewayException } from '@nestjs/common';
import { MeliRateLimitException } from 'src/core/drivers/repositories/mercadolibre/http/error/meliHttpError';
import { GetProductsVisitRepository } from './GetProductsVisitRepository';

const idFromPath = (path: string) =>
  new URLSearchParams(path.split('?')[1]).get('ids')!;

describe('GetProductsVisitRepository', () => {
  it('asks Mercado Libre one id per call (ML rejects more than 1)', async () => {
    const http = {
      get: jest.fn(async (path: string) => {
        const id = idFromPath(path);
        expect(id).not.toContain(',');
        return { [id]: 3 };
      }),
    };
    const repo = new GetProductsVisitRepository(http as never);

    const result = await repo.getVisitsByIds(['MLA1', 'MLA2', 'MLA3', 'MLA4']);

    expect(http.get).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ MLA1: 3, MLA2: 3, MLA3: 3, MLA4: 3 });
  });

  it('omits ids Mercado Libre did not answer', async () => {
    const http = {
      get: jest.fn(async (path: string) => {
        const id = idFromPath(path);
        return id === 'MLA999' ? null : { [id]: 0 };
      }),
    };
    const repo = new GetProductsVisitRepository(http as never);

    expect(await repo.getVisitsByIds(['MLA1', 'MLA999'])).toEqual({ MLA1: 0 });
  });

  it('throws 502 when several ids were requested and none was answered', async () => {
    const http = { get: jest.fn().mockResolvedValue(null) };
    const repo = new GetProductsVisitRepository(http as never);

    await expect(repo.getVisitsByIds(['MLA1', 'MLA2'])).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('returns what was measured before a rate limit, without retrying', async () => {
    let calls = 0;
    const http = {
      get: jest.fn(async (path: string) => {
        calls++;
        if (calls > 2) throw new MeliRateLimitException(30);
        return { [idFromPath(path)]: 5 };
      }),
    };
    const repo = new GetProductsVisitRepository(http as never);
    const ids = Array.from({ length: 20 }, (_, i) => `MLA${i}`);

    const result = await repo.getVisitsByIds(ids);

    expect(Object.keys(result)).toHaveLength(2);
    expect(http.get.mock.calls.length).toBeLessThan(ids.length);
  });

  it('propagates the 429 when nothing could be measured', async () => {
    const http = {
      get: jest.fn().mockRejectedValue(new MeliRateLimitException(30)),
    };
    const repo = new GetProductsVisitRepository(http as never);

    await expect(repo.getVisitsByIds(['MLA1', 'MLA2'])).rejects.toThrow(
      MeliRateLimitException,
    );
  });
});
