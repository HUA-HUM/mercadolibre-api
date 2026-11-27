import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OrderInvoiceService } from 'src/app/services/orders/OrderInvoiceService';
import type { InvoiceFile } from 'src/core/adapters/repositories/mercadolibre/orders/IOrderInvoiceRepository';
import { MeliOrderInvoiceController } from './MeliOrderInvoice.Controller';

describe('MeliOrderInvoiceController (HTTP)', () => {
  let app: INestApplication;
  const repo = {
    resolveTarget: jest.fn(),
    listInvoices: jest.fn(),
    uploadInvoice: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeliOrderInvoiceController],
      providers: [
        OrderInvoiceService,
        { provide: 'IOrderInvoiceRepository', useValue: repo },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    repo.resolveTarget.mockResolvedValue({ orderId: '11', packId: '22' });
    repo.listInvoices.mockResolvedValue(null);
    repo.uploadInvoice.mockResolvedValue({ ok: true });
  });

  const pdf = Buffer.from('%PDF-1.4 fake');

  it('receives the PDF and uploads it to the cart', async () => {
    const res = await request(app.getHttpServer())
      .post('/meli/orders/11/invoice')
      .attach('fiscal_document', pdf, {
        filename: 'factura.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body).toEqual({
      orderId: '11',
      packId: '22',
      meliResponse: { ok: true },
    });
    const [packId, files] = repo.uploadInvoice.mock.calls[0] as [
      string,
      InvoiceFile[],
    ];
    expect(packId).toBe('22');
    expect(files[0].originalname).toBe('factura.pdf');
    expect(files[0].buffer.toString()).toBe('%PDF-1.4 fake');
  });

  it('answers 400 without a PDF', async () => {
    await request(app.getHttpServer())
      .post('/meli/orders/11/invoice')
      .attach('fiscal_document', Buffer.from('hola'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/meli/orders/11/invoice')
      .expect(400);

    expect(repo.uploadInvoice).not.toHaveBeenCalled();
  });

  it('answers 409 when the order already has an invoice, unless force=true', async () => {
    repo.listInvoices.mockResolvedValue({ fiscal_documents: ['a1'] });

    await request(app.getHttpServer())
      .post('/meli/orders/11/invoice')
      .attach('fiscal_document', pdf, {
        filename: 'f.pdf',
        contentType: 'application/pdf',
      })
      .expect(409);
    expect(repo.uploadInvoice).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/meli/orders/11/invoice?force=true')
      .attach('fiscal_document', pdf, {
        filename: 'f.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(repo.uploadInvoice).toHaveBeenCalledTimes(1);
  });

  it('reports whether the order has an invoice', async () => {
    const res = await request(app.getHttpServer())
      .get('/meli/orders/11/invoice')
      .expect(200);

    expect(res.body).toEqual({
      orderId: '11',
      packId: '22',
      hasInvoice: false,
      documents: null,
    });
  });

  it('answers 404 for an unknown order and 400 for a non numeric id', async () => {
    repo.resolveTarget.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/meli/orders/99/invoice')
      .expect(404);
    await request(app.getHttpServer())
      .get('/meli/orders/abc/invoice')
      .expect(400);
  });
});
