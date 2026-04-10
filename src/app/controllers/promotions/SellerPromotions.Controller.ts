import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/InternalApiKeyGuard';
import { GetSellerPromotionsService } from 'src/app/services/promotions/GetSellerPromotionsService';

@ApiTags('MercadoLibre - Promotions')
@ApiSecurity('x-internal-api-key')
@Controller('meli/seller-promotions')
@UseGuards(InternalApiKeyGuard)
export class SellerPromotionsController {
  constructor(
    private readonly getSellerPromotionsService: GetSellerPromotionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtiene promociones del seller disponibles para participar',
    description:
      'Proxy fijo del endpoint seller-promotions usando siempre la app promotions-engine-api, el seller configurado en .env y app_version=v2.',
  })
  @ApiOkResponse({
    description: 'Respuesta original de seller-promotions',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron promociones para el seller configurado',
  })
  async getConfiguredUserPromotions() {
    const response =
      await this.getSellerPromotionsService.getCurrentSellerPromotions();

    if (!response) {
      throw new NotFoundException(
        'Promotions not found for configured Mercado Libre seller',
      );
    }

    return response;
  }

  @Get(':promotionId/items')
  @ApiOperation({
    summary: 'Obtiene los items de una promoción',
    description:
      'Proxy fijo del endpoint seller-promotions/promotions/:promotionId/items usando siempre la app promotions-engine-api y app_version=v2.',
  })
  @ApiParam({
    name: 'promotionId',
    required: true,
    example: 'P-MLA16593002',
    description: 'ID de la promoción en Mercado Libre',
  })
  @ApiQuery({
    name: 'promotion_type',
    required: false,
    example: 'DEAL',
    description: 'Tipo de promoción. Si no se envía, usa DEAL.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Cantidad de items por página.',
  })
  @ApiQuery({
    name: 'searchAfter',
    required: false,
    example:
      '4863e1ede92ada584c35ce34871db1e8c05565bf1f0a404303dfd37642c692de36400358500380018770bbdf8759460a863e7b68ff8418bdf6a0d581223cec3fc8779d572d94ede534ebfaf2e10c1a44b11d98e66eb624903093922cb6e47e433c2f1a121cbe0bd220a8be3b4220fc9065fa42a17562f5ea52e364e45559074d',
    description:
      'Cursor devuelto por Mercado Libre en paging.searchAfter para continuar la paginación.',
  })
  @ApiOkResponse({
    description: 'Respuesta original de items de la promoción',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron items para la promoción indicada',
  })
  async getPromotionItems(
    @Param('promotionId') promotionId: string,
    @Query('promotion_type') promotionType = 'DEAL',
    @Query('limit') limit?: string,
    @Query('searchAfter') searchAfter?: string,
  ) {
    const response = await this.getSellerPromotionsService.getPromotionItems(
      promotionId,
      promotionType,
      limit ? Number(limit) : undefined,
      searchAfter,
    );

    if (!response) {
      throw new NotFoundException(
        `Promotion items not found for promotion ${promotionId}`,
      );
    }

    return response;
  }

  @Post('items/:itemId')
  @ApiOperation({
    summary: 'Activa una campaña para un item',
    description:
      'Proxy fijo del endpoint seller-promotions/items/:itemId usando siempre la app promotions-engine-api, app_version=v2 y protección por API key.',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA2864401424',
    description: 'ID del item en Mercado Libre',
  })
  @ApiBody({
    schema: {
      example: {
        promotion_id: 'P-MLA17385040',
        promotion_type: 'SMART',
        offer_id: 'CANDIDATE-MLA2864401424-71148797613',
      },
    },
  })
  @ApiOkResponse({
    description: 'Respuesta original de Mercado Libre al activar la campaña',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'No se pudo activar la campaña para el item indicado',
  })
  async activatePromotionForItem(
    @Param('itemId') itemId: string,
    @Body()
    body: {
      promotion_id: string;
      promotion_type: string;
      offer_id: string;
    },
  ) {
    const response =
      await this.getSellerPromotionsService.activatePromotionForItem(
        itemId,
        body,
      );

    if (!response) {
      throw new NotFoundException(
        `Promotion activation failed for item ${itemId}`,
      );
    }

    return response;
  }

  @Delete('items/:itemId')
  @ApiOperation({
    summary: 'Elimina una promoción de un item',
    description:
      'Proxy fijo del endpoint seller-promotions/items/:itemId usando siempre la app promotions-engine-api, app_version=v2 y protección por API key.',
  })
  @ApiParam({
    name: 'itemId',
    required: true,
    example: 'MLA2696213102',
    description: 'ID del item en Mercado Libre',
  })
  @ApiOkResponse({
    description: 'Respuesta original de Mercado Libre al eliminar la promoción',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'No se pudo eliminar la promoción para el item indicado',
  })
  async removePromotionForItem(@Param('itemId') itemId: string) {
    const response =
      await this.getSellerPromotionsService.removePromotionForItem(itemId);

    if (!response) {
      throw new NotFoundException(
        `Promotion removal failed for item ${itemId}`,
      );
    }

    return response;
  }
}
