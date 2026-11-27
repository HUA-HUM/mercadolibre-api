import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { MeliHttpClient } from 'src/core/drivers/repositories/mercadolibre/http/MeliHttpClient';
import { MeliRateLimitException } from 'src/core/drivers/repositories/mercadolibre/http/error/meliHttpError';
import { OrderInvoiceRepository } from './OrderInvoiceRepository';

type Captured = {
  method?: string;
  url?: string;
  headers: IncomingMessage['headers'];
  body: string;
};

describe('OrderInvoiceRepository', () => {
  let server: Server;
  let captured: Captured;
  let reply: { status: number; body: unknown };
  let http: MeliHttpClient;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        captured = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks).toString('latin1'),
        };
        res.writeHead(reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;

    http = new MeliHttpClient({
      execute: () => Promise.resolve('TOKEN'),
    } as never);
    // Point the real client at the local server instead of Mercado Libre.
    (
      http as unknown as { client: { defaults: { baseURL: string } } }
    ).client.defaults.baseURL = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise((r) => server.close(r)));

  beforeEach(() => {
    reply = { status: 201, body: { ids: ['abc'] } };
  });

  const pdf = {
    originalname: 'factura.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake'),
    size: 13,
  };
  const xml = {
    originalname: 'factura.xml',
    mimetype: 'application/xml',
    buffer: Buffer.from('<x/>'),
    size: 4,
  };

  it('sends the files as multipart in the fiscal_document field', async () => {
    const repo = new OrderInvoiceRepository(http);

    const result = await repo.uploadInvoice('2000016292307607', [pdf, xml]);

    expect(result).toEqual({ ids: ['abc'] });
    expect(captured.method).toBe('POST');
    expect(captured.url).toBe('/packs/2000016292307607/fiscal_documents');
    expect(captured.headers.authorization).toBe('Bearer TOKEN');
    expect(captured.headers['content-type']).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    expect(captured.body).toContain(
      'Content-Disposition: form-data; name="fiscal_document"; filename="factura.pdf"',
    );
    expect(captured.body).toContain('Content-Type: application/pdf');
    expect(captured.body).toContain('%PDF-1.4 fake');
    expect(captured.body).toContain('filename="factura.xml"');
  });

  it('turns a 403 into Forbidden with what Mercado Libre said', async () => {
    reply = { status: 403, body: { message: 'forbidden' } };
    const error = await new OrderInvoiceRepository(http)
      .uploadInvoice('1', [pdf])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      operation: 'upload_invoice',
      meliStatus: 403,
      meliResponse: { message: 'forbidden' },
    });
  });

  it('turns any other rejection into 502', async () => {
    reply = { status: 400, body: { message: 'invalid file' } };
    await expect(
      new OrderInvoiceRepository(http).uploadInvoice('1', [pdf]),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('propagates a rate limit as 429', async () => {
    reply = { status: 429, body: {} };
    await expect(
      new OrderInvoiceRepository(http).uploadInvoice('1', [pdf]),
    ).rejects.toBeInstanceOf(MeliRateLimitException);
  });

  it('targets the cart when the order is in one, and the order otherwise', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ id: 11, pack_id: 22 })
      .mockResolvedValueOnce({ id: 33, pack_id: null })
      .mockResolvedValueOnce(null);
    const repo = new OrderInvoiceRepository({ get } as never);

    expect(await repo.resolveTarget('11')).toEqual({
      orderId: '11',
      packId: '22',
    });
    expect(await repo.resolveTarget('33')).toEqual({
      orderId: '33',
      packId: '33',
    });
    expect(await repo.resolveTarget('44')).toBeNull();
  });
});
