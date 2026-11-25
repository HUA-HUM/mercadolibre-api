import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiOkResponse,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MeliVisitsService } from 'src/app/services/metrics/products/visits/meli-visitsService';

@ApiTags('MercadoLibre - Metrics')
@Controller('meli/items')
export class MeliVisitsController {
  constructor(private readonly service: MeliVisitsService) {}

  @Get('visits')
  @ApiOperation({
    summary: 'Obtiene visitas totales de varios items en una sola llamada',
    description: `
Versión en lote de \`GET /meli/items/:itemId/visits\`. Mercado Libre acepta
**un solo id por llamada** en \`/visits/items\`, así que el proxy consulta los ids
de a uno (3 en paralelo) y cachea los totales 30 minutos. Ahorra round-trips
entre servicios, pero **no** reduce las llamadas a Mercado Libre.

📌 **Contrato**
- Máximo 100 ids por request.
- Solo se devuelven ids con una medición real de Mercado Libre. Los ids que ML
  no contestó (inexistentes, sin permiso, lote rechazado) **se omiten**: un
  \`total: 0\` es siempre un 0 real.
- Los fallos no se cachean: un id omitido se puede volver a pedir enseguida.
- Si ML aplica rate limit a mitad del lote, se devuelve lo medido hasta ahí
  (los demás ids se omiten); si no se llegó a medir nada, **429** con header
  \`Retry-After\`.
- Si ML no contestó ningún id, **502**. Nunca un 200 con ceros por un fallo.
    `,
  })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'Item IDs separados por coma',
    example: 'MLA1757293732,MLA1496032965',
  })
  @ApiOkResponse({
    description: 'Visitas totales por item',
    schema: {
      example: [
        { item_id: 'MLA1757293732', total: 49 },
        { item_id: 'MLA1496032965', total: 12 },
      ],
    },
  })
  @ApiResponse({ status: 429, description: 'Rate limit de Mercado Libre' })
  @ApiResponse({
    status: 502,
    description: 'Mercado Libre no devolvió visitas para ningún id',
  })
  getVisitsBulk(@Query('ids') ids?: string) {
    return this.service.getProductsVisits((ids ?? '').split(','));
  }

  @Get(':itemId/visits')
  @ApiOperation({
    summary: 'Obtiene visitas totales recientes de un item de MercadoLibre',
    description: `
Devuelve un **snapshot de visitas totales** del producto usando
el endpoint oficial de MercadoLibre:

\`GET /visits/items?ids=:itemId\`

📌 **Notas**
- No devuelve series temporales.
- No acepta rangos de fechas.
- MercadoLibre retorna solo el total acumulado.
- El item debe pertenecer al seller autenticado.
    `,
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID del item de MercadoLibre',
    example: 'MLA1757293732',
  })
  @ApiOkResponse({
    description: 'Visitas totales del producto',
    schema: {
      example: {
        item_id: 'MLA1757293732',
        total: 49,
      },
    },
  })
  getVisits(@Param('itemId') itemId: string) {
    return this.service.getProductVisits(itemId);
  }
}
