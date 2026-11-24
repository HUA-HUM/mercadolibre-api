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
});
