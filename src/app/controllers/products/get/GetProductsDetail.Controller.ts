import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GetMeliProductDetailService } from 'src/app/services/products/get/GetMeliProductDetailService';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';

@ApiTags('MercadoLibre - Products')
@Controller('meli/products')
export class GetProductsDetailController {
  constructor(
    private readonly getMeliProductDetail: GetMeliProductDetailService,
  ) {}

  @Get('bulk')
  @ApiOperation({
    summary: 'Obtener detalle de múltiples productos',
    description:
      'Devuelve el mismo formato del detalle individual para múltiples items usando multiget de Mercado Libre y el token default.',
  })
  @ApiQuery({
    name: 'ids',
    required: true,
    example: 'MLA1757293798,MLA1757293732',
    description: 'Lista de item IDs separados por coma.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de detalles de productos',
    type: Object,
  })
  async getProductsBulk(@Query('ids') ids: string): Promise<MeliProductDetail[]> {
    const itemIds = ids
      .split(',')
      .map((itemId) => itemId.trim())
      .filter(Boolean);

    return this.getMeliProductDetail.getBulk(itemIds);
  }

  @Get(':itemId')
  @ApiOperation({
    summary: 'Obtener detalle de producto por itemId',
    description:
      'Devuelve información resumida del producto desde Mercado Libre.',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA1424563181',
    description: 'ID del item en Mercado Libre',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del producto',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
  })
  async getProduct(
    @Param('itemId') itemId: string,
  ): Promise<MeliProductDetail> {
    const product = await this.getMeliProductDetail.execute(itemId);

    if (!product) {
      throw new NotFoundException(`Product with id ${itemId} not found`);
    }

    return product;
  }

  @Get(':itemId/description')
  @ApiOperation({
    summary: 'Obtener descripción cruda del producto por itemId',
    description:
      'Devuelve la respuesta original de Mercado Libre para /items/:itemId/description usando el token default.',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA3121905058',
    description: 'ID del item en Mercado Libre',
  })
  @ApiResponse({
    status: 200,
    description: 'Descripción original del producto',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Descripción no encontrada',
  })
  async getProductDescription(
    @Param('itemId') itemId: string,
  ): Promise<MeliProductDescription> {
    const description = await this.getMeliProductDetail.getDescription(itemId);

    if (!description) {
      throw new NotFoundException(
        `Product description with id ${itemId} not found`,
      );
    }

    return description;
  }
}
