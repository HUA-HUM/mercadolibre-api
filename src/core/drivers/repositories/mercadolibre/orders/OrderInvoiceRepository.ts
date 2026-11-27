/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  BadGatewayException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import type {
  InvoiceFile,
  IOrderInvoiceRepository,
  OrderInvoiceTarget,
} from 'src/core/adapters/repositories/mercadolibre/orders/IOrderInvoiceRepository';
import { MeliRateLimitException } from '../http/error/meliHttpError';

@Injectable()
export class OrderInvoiceRepository implements IOrderInvoiceRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async resolveTarget(orderId: string): Promise<OrderInvoiceTarget | null> {
    const order = await this.meliHttpClient.get<any>(`/orders/${orderId}`);
    if (!order?.id) {
      return null;
    }

    // Mercado Libre attaches invoices to the cart. An order without cart is
    // addressed by its own id; an order inside a cart must use the cart id
    // (asking with the order id answers 400 order_belong_pack).
    return {
      orderId: String(order.id),
      packId: String(order.pack_id ?? order.id),
    };
  }

  listInvoices(packId: string): Promise<unknown> {
    // 404 "pack_fiscal_document … does not exist" means nothing uploaded yet;
    // the client turns it into null.
    return this.meliHttpClient.get<unknown>(
      `/packs/${packId}/fiscal_documents`,
    );
  }

  async uploadInvoice(packId: string, files: InvoiceFile[]): Promise<unknown> {
    const form = new FormData();
    for (const file of files) {
      form.append(
        'fiscal_document',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
    }

    const path = `/packs/${packId}/fiscal_documents`;
    const response = await this.meliHttpClient.postWithMeta<unknown>(
      path,
      form,
      // Overrides the client's JSON default; axios adds the boundary.
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const status = response?.status;
    if (status !== undefined && status >= 200 && status < 300) {
      return response?.data ?? null;
    }

    if (status === 429) {
      throw new MeliRateLimitException(60, path);
    }

    const body = {
      statusCode: status === 403 ? 403 : 502,
      message: `Mercado Libre could not attach the invoice to pack ${packId}`,
      operation: 'upload_invoice',
      packId,
      meliStatus: status ?? null,
      meliResponse: response?.data ?? null,
    };

    throw status === 403
      ? new ForbiddenException(body)
      : new BadGatewayException(body);
  }
}
