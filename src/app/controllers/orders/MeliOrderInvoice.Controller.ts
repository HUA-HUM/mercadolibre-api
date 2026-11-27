import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrderInvoiceService } from 'src/app/services/orders/OrderInvoiceService';
import type { InvoiceFile } from 'src/core/adapters/repositories/mercadolibre/orders/IOrderInvoiceRepository';

/** Upper bound to protect the server's memory; Mercado Libre may allow less. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

@ApiTags('MercadoLibre - Orders')
@Controller('meli/orders')
export class MeliOrderInvoiceController {
  constructor(private readonly service: OrderInvoiceService) {}

  @Get(':orderId/invoice')
  @ApiOperation({
    summary: 'Factura cargada en Mercado Libre para una venta',
    description: `
Consulta si la venta ya tiene factura adjunta en Mercado Libre.

La factura vive en el carrito (pack). Si la venta no está en un carrito, se usa el
número de venta. El servicio resuelve cuál corresponde.
    `,
  })
  @ApiParam({ name: 'orderId', example: '2000019814868660' })
  @ApiOkResponse({
    schema: {
      example: {
        orderId: '2000019814868660',
        packId: '2000019814868660',
        hasInvoice: false,
        documents: null,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Order with id … not found' })
  getInvoice(@Param('orderId') orderId: string) {
    return this.service.getInvoices(orderId);
  }

  @Post(':orderId/invoice')
  @UseInterceptors(
    FilesInterceptor('fiscal_document', 2, {
      limits: { fileSize: MAX_FILE_BYTES, files: 2 },
    }),
  )
  @ApiOperation({
    summary: 'Adjunta la factura a una venta en Mercado Libre',
    description: `
Sube el PDF de la factura (y opcionalmente su XML) a la venta. El comprador la ve
en el detalle de su compra en Mercado Libre.

📌 **Notas**
- Multipart, campo **fiscal_document**: un PDF obligatorio y como máximo un XML.
- Subir solo comprobantes con CAE.
- Si la venta ya tiene factura responde **409**; con **force=true** sube otra igual
  (por ejemplo, después de una nota de crédito).
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fiscal_document'],
      properties: {
        fiscal_document: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiParam({ name: 'orderId', example: '2000019814868660' })
  @ApiQuery({
    name: 'force',
    required: false,
    description: 'true para subir aunque ya haya una factura',
  })
  @ApiOkResponse({ description: 'Factura adjuntada' })
  @ApiBadRequestResponse({
    description: 'Falta el PDF o el archivo no es PDF/XML',
  })
  @ApiNotFoundResponse({ description: 'Order with id … not found' })
  @ApiConflictResponse({ description: 'La venta ya tiene factura' })
  uploadInvoice(
    @Param('orderId') orderId: string,
    @UploadedFiles() files: InvoiceFile[] | undefined,
    @Query('force') force?: string,
  ) {
    return this.service.uploadInvoice(orderId, files, force === 'true');
  }
}
