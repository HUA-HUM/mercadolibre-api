import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/InternalApiKeyGuard';
import { MeliProductDeleteQueueService } from './meli-product-delete-queue.service';

interface BulkDeleteMeliProductsBody {
  ids: string[] | string;
  appKey?: string;
}

@ApiTags('MercadoLibre - Products')
@Controller('meli/products')
export class MeliProductDeleteQueueController {
  constructor(private readonly queueService: MeliProductDeleteQueueService) {}

  @Post('bulk/delete')
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('x-internal-api-key')
  @ApiOperation({
    summary: 'Encola eliminación masiva de publicaciones',
    description:
      'Recibe múltiples item IDs de Mercado Libre, los encola en BullMQ y los procesa de a uno con reintentos automáticos.',
  })
  @ApiBody({
    schema: {
      example: {
        ids: ['MLA1496032965', 'MLA1757293798'],
        appKey: 'default',
      },
      oneOf: [
        {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
            },
            appKey: {
              type: 'string',
              enum: ['default', 'promotions-engine-api'],
            },
          },
          required: ['ids'],
        },
        {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              example: 'MLA1496032965,MLA1757293798',
            },
            appKey: {
              type: 'string',
              enum: ['default', 'promotions-engine-api'],
            },
          },
          required: ['ids'],
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Publicaciones encoladas para eliminación.',
    schema: {
      example: {
        batchId: '1a895bad-d2f8-4d83-8f98-9112105c456b',
        queued: 2,
        appKey: 'default',
        jobs: [
          {
            itemId: 'MLA1496032965',
            jobId: '1a895bad-d2f8-4d83-8f98-9112105c456b-MLA1496032965',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido.',
  })
  @ApiResponse({
    status: 401,
    description: 'API key interna ausente o inválida.',
  })
  async enqueueBulkDelete(@Body() body: BulkDeleteMeliProductsBody) {
    const itemIds = this.parseItemIds(body.ids);
    const appKey = body.appKey ?? 'default';

    if (!['default', 'promotions-engine-api'].includes(appKey)) {
      throw new BadRequestException(`Unsupported appKey "${appKey}"`);
    }

    if (itemIds.length === 0) {
      throw new BadRequestException('At least one item id is required');
    }

    return this.queueService.enqueueBulkDelete({
      itemIds,
      appKey,
    });
  }

  private parseItemIds(ids: string[] | string): string[] {
    if (Array.isArray(ids)) {
      return ids.map((id) => id.trim()).filter(Boolean);
    }

    if (typeof ids === 'string') {
      return ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    return [];
  }
}
