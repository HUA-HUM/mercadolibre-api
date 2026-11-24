import { BadGatewayException } from '@nestjs/common';
import { GetProductsVisitRepository } from './GetProductsVisitRepository';

describe('GetProductsVisitRepository', () => {
  it('batches ids in groups of 50 per Mercado Libre call', async () => {
    const http = {
      get: jest.fn(async (path: string) => {
        const ids = new URLSearchParams(path.split('?')[1])
          .get('ids')!
          .split(',');
        return Object.fromEntries(ids.map((id) => [id, 1]));
      }),
    };
    const repo = new GetProductsVisitRepository(http as never);
    const ids = Array.from({ length: 120 }, (_, i) => `MLA${i}`);

    const result = await repo.getVisitsByIds(ids);

    expect(http.get).toHaveBeenCalledTimes(3);
    expect(Object.keys(result)).toHaveLength(120);
  });

  it('throws 502 when Mercado Libre answered no chunk at all', async () => {
    const http = { get: jest.fn().mockResolvedValue(null) };
    const repo = new GetProductsVisitRepository(http as never);

    await expect(repo.getVisitsByIds(['MLA1', 'MLA2'])).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('omits ids from a rejected chunk but keeps the answered ones', async () => {
    const http = {
      get: jest
        .fn()
        .mockResolvedValueOnce(
          Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`MLA${i}`, i]),
          ),
        )
        .mockResolvedValueOnce(null),
    };
    const repo = new GetProductsVisitRepository(http as never);
    const ids = Array.from({ length: 60 }, (_, i) => `MLA${i}`);

    const result = await repo.getVisitsByIds(ids);

    expect(Object.keys(result)).toHaveLength(50);
    expect(result.MLA55).toBeUndefined();
  });
});
