import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IGetOrderDetailRepository } from 'src/core/adapters/repositories/mercadolibre/orders/IGetOrderDetailRepository';
import {
  OrderDetailEntity,
  PackDetailEntity,
} from 'src/core/entitis/mercadolibre/orders/OrderDetailEntity';

const NUMERIC_ID = /^\d{1,30}$/;

@Injectable()
export class GetOrderDetailService {
  constructor(
    @Inject('IGetOrderDetailRepository')
    private readonly repository: IGetOrderDetailRepository,
  ) {}

  async getOrderDetail(orderId: string): Promise<OrderDetailEntity> {
    if (!NUMERIC_ID.test(orderId ?? '')) {
      throw new BadRequestException('OrderId must be numeric');
    }

    const detail = await this.repository.getOrderDetail(orderId);
    if (!detail) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return detail;
  }

  async getPackDetail(packId: string): Promise<PackDetailEntity> {
    if (!NUMERIC_ID.test(packId ?? '')) {
      throw new BadRequestException('PackId must be numeric');
    }

    const detail = await this.repository.getPackDetail(packId);
    if (!detail) {
      throw new NotFoundException(`Pack with id ${packId} not found`);
    }

    return detail;
  }
}
