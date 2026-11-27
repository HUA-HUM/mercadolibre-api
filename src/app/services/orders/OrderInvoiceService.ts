import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  InvoiceFile,
  IOrderInvoiceRepository,
  OrderInvoiceTarget,
} from 'src/core/adapters/repositories/mercadolibre/orders/IOrderInvoiceRepository';

const NUMERIC_ID = /^\d{1,30}$/;

const isPdf = (file: InvoiceFile) =>
  file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);

const isXml = (file: InvoiceFile) =>
  ['application/xml', 'text/xml'].includes(file.mimetype) ||
  /\.xml$/i.test(file.originalname);

/** True when Mercado Libre's answer lists at least one document. */
export const hasDocuments = (data: unknown): boolean => {
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>);
    const lists = values.filter(Array.isArray);
    return lists.length > 0 ? lists.some((list) => list.length > 0) : true;
  }
  return true;
};

export type OrderInvoiceStatus = OrderInvoiceTarget & {
  hasInvoice: boolean;
  /** Mercado Libre's answer as is. */
  documents: unknown;
};

@Injectable()
export class OrderInvoiceService {
  constructor(
    @Inject('IOrderInvoiceRepository')
    private readonly repository: IOrderInvoiceRepository,
  ) {}

  async getInvoices(orderId: string): Promise<OrderInvoiceStatus> {
    const target = await this.resolve(orderId);
    const documents = await this.repository.listInvoices(target.packId);

    return {
      ...target,
      hasInvoice: hasDocuments(documents),
      documents: documents ?? null,
    };
  }

  async uploadInvoice(
    orderId: string,
    files: InvoiceFile[] | undefined,
    force: boolean,
  ): Promise<OrderInvoiceTarget & { meliResponse: unknown }> {
    this.validateFiles(files ?? []);
    const target = await this.resolve(orderId);

    if (!force) {
      const existing = await this.repository.listInvoices(target.packId);
      if (hasDocuments(existing)) {
        throw new ConflictException({
          statusCode: 409,
          message: `Order ${orderId} already has an invoice in Mercado Libre. Send force=true to upload another one.`,
          ...target,
          documents: existing,
        });
      }
    }

    const meliResponse = await this.repository.uploadInvoice(
      target.packId,
      files!,
    );

    return { ...target, meliResponse };
  }

  private async resolve(orderId: string): Promise<OrderInvoiceTarget> {
    if (!NUMERIC_ID.test(orderId ?? '')) {
      throw new BadRequestException('OrderId must be numeric');
    }

    const target = await this.repository.resolveTarget(orderId);
    if (!target) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return target;
  }

  private validateFiles(files: InvoiceFile[]): void {
    if (files.length === 0) {
      throw new BadRequestException(
        'A PDF is required in the multipart field "fiscal_document"',
      );
    }

    const invalid = files.find((file) => !isPdf(file) && !isXml(file));
    if (invalid) {
      throw new BadRequestException(
        `Only PDF or XML files are accepted (received "${invalid.originalname}")`,
      );
    }

    if (files.filter(isPdf).length !== 1) {
      throw new BadRequestException('Exactly one PDF is required');
    }

    if (files.filter(isXml).length > 1) {
      throw new BadRequestException('At most one XML is accepted');
    }
  }
}
