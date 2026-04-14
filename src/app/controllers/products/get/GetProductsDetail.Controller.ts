import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GetMeliProductDetailService } from 'src/app/services/products/get/GetMeliProductDetailService';
import { MeliProductDescription } from 'src/core/entitis/mercadolibre/products/get/MeliProductDescription';
import { MeliProductDetail } from 'src/core/entitis/mercadolibre/products/get/MeliProductDetail';
import { MeliListingPrice } from 'src/core/entitis/mercadolibre/products/get/MeliListingPrice';

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

  @Get(':itemId/commission')
  @ApiOperation({
    summary: 'Calcula la comisión del producto por itemId',
    description:
      'Consulta listing_prices en Mercado Libre usando el token default. Si enviás price/category_id/listing_type_id, usa esos valores; si no, los resuelve automáticamente desde el item.',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA1757293798',
    description: 'ID del item en Mercado Libre',
  })
  @ApiQuery({
    name: 'price',
    required: false,
    example: 1019000,
    description: 'Precio del item. Si no se envía, se toma del item.',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    example: 'MLA456045',
    description: 'Categoría del item. Si no se envía, se toma del item.',
  })
  @ApiQuery({
    name: 'listing_type_id',
    required: false,
    example: 'gold_special',
    description:
      'Tipo de publicación del item. Si no se envía, se toma del item.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta original de listing_prices',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'No se pudo calcular la comisión para el producto',
  })
  async getProductCommission(
    @Param('itemId') itemId: string,
    @Query('price') price?: string,
    @Query('category_id') categoryId?: string,
    @Query('listing_type_id') listingTypeId?: string,
  ): Promise<MeliListingPrice[]> {
    const listingPrices =
      await this.getMeliProductDetail.getListingPrices(itemId, {
        price: price ? Number(price) : undefined,
        categoryId,
        listingTypeId,
      });

    if (!listingPrices) {
      throw new NotFoundException(
        `Listing prices for product ${itemId} not found`,
      );
    }

    return listingPrices;
  }
}
