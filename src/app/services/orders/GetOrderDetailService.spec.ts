import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetOrderDetailService } from './GetOrderDetailService';

describe('GetOrderDetailService', () => {
  const repo = {
    getOrderDetail: jest.fn(),
    getPackDetail: jest.fn(),
  };
  const service = new GetOrderDetailService(repo);

  afterEach(() => jest.resetAllMocks());

  it('rejects a non numeric order id without calling Mercado Libre', async () => {
    await expect(service.getOrderDetail('abc')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getPackDetail('12;3')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.getOrderDetail).not.toHaveBeenCalled();
    expect(repo.getPackDetail).not.toHaveBeenCalled();
  });

  it('answers 404 when Mercado Libre has no such order or pack', async () => {
    repo.getOrderDetail.mockResolvedValue(null);
    repo.getPackDetail.mockResolvedValue(null);

    await expect(service.getOrderDetail('123')).rejects.toThrow(
      new NotFoundException('Order with id 123 not found'),
    );
    await expect(service.getPackDetail('456')).rejects.toThrow(
      new NotFoundException('Pack with id 456 not found'),
    );
  });

  it('returns the detail', async () => {
    repo.getOrderDetail.mockResolvedValue({ id: 123 });
    expect(await service.getOrderDetail('123')).toEqual({ id: 123 });
  });
});
