import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeliVisitsService, VISITS_CACHE_TTL_MS } from './meli-visitsService';

describe('MeliVisitsService', () => {
  const makeService = () => {
    const repo = {
      getVisitsById: jest.fn(),
      getVisitsByIds: jest.fn(async (ids: string[]) =>
        Object.fromEntries(ids.map((id) => [id, id.length])),
      ),
    };
    return { service: new MeliVisitsService(repo), repo };
  };

  afterEach(() => jest.useRealTimers());

  it('serves repeated lookups from cache', async () => {
    const { service, repo } = makeService();

    await service.getProductVisits('MLA1');
    await service.getProductVisits('MLA1');

    expect(repo.getVisitsByIds).toHaveBeenCalledTimes(1);
  });

  it('only fetches ids that are not cached', async () => {
    const { service, repo } = makeService();

    await service.getProductsVisits(['MLA1']);
    const result = await service.getProductsVisits(['MLA1', 'MLA22', 'MLA22']);

    expect(repo.getVisitsByIds).toHaveBeenLastCalledWith(['MLA22']);
    expect(result).toEqual([
      { item_id: 'MLA1', total: 4 },
      { item_id: 'MLA22', total: 5 },
    ]);
  });

  it('refetches after the TTL expires', async () => {
    jest.useFakeTimers();
    const { service, repo } = makeService();

    await service.getProductVisits('MLA1');
    jest.advanceTimersByTime(VISITS_CACHE_TTL_MS + 1);
    await service.getProductVisits('MLA1');

    expect(repo.getVisitsByIds).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty id list', async () => {
    const { service } = makeService();
    await expect(service.getProductsVisits([''])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('omits ids Mercado Libre did not answer instead of returning 0', async () => {
    const { service, repo } = makeService();
    repo.getVisitsByIds.mockResolvedValueOnce({ MLA1: 0, MLA2: 7 });

    const result = await service.getProductsVisits(['MLA1', 'MLA2', 'MLA999']);

    expect(result).toEqual([
      { item_id: 'MLA1', total: 0 },
      { item_id: 'MLA2', total: 7 },
    ]);
  });

  it('does not cache unresolved ids, so they are retried', async () => {
    const { service, repo } = makeService();
    repo.getVisitsByIds.mockResolvedValueOnce({});

    await service.getProductsVisits(['MLA1']);
    const result = await service.getProductsVisits(['MLA1']);

    expect(repo.getVisitsByIds).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ item_id: 'MLA1', total: 4 }]);
  });

  it('returns 404 on the single endpoint when Mercado Libre has no data', async () => {
    const { service, repo } = makeService();
    repo.getVisitsByIds.mockResolvedValueOnce({});

    await expect(service.getProductVisits('MLA999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
