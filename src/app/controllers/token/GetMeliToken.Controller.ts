import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiQuery,
  ApiOperation,
  ApiTags,
  ApiSecurity,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GetMeliTokenService } from 'src/app/services/token/GetMeliTokenService';
import { InternalApiKeyGuard } from 'src/app/guards/InternalApiKeyGuard';

@ApiTags('MercadoLibre - Internal')
@ApiSecurity('x-internal-api-key')
@Controller('api/internal/mercadolibre')
@UseGuards(InternalApiKeyGuard)
export class GetMeliTokenController {
  constructor(private readonly service: GetMeliTokenService) {}

  @Get('token')
  @ApiOperation({
    summary: 'Devuelve el token actual de MercadoLibre almacenado en DB',
    description: `
⚠️ **Endpoint interno**
- No refresca el token
- No valida expiración
- Devuelve exactamente lo persistido en base de datos
- Si enviás \`appKey\`, devuelve esa app puntual
- Si enviás \`all=true\`, devuelve todos los tokens configurados conocidos
    `,
  })
  @ApiQuery({
    name: 'appKey',
    required: false,
    description: 'App puntual a consultar. Si no se envía, usa "default".',
    example: 'promotions-engine-api',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    description: 'Si es true, devuelve todos los tokens configurados conocidos.',
    example: false,
  })
  @ApiOkResponse({
    description: 'Token actual de MercadoLibre o mapa de tokens por app',
    schema: {
      example: {
        default: {
          id: 1,
          app_key: 'default',
          client_id: '6686220072679778',
          access_token: 'APP_USR-...',
          refresh_token: 'TG-...',
          expires_in: 21600,
          expires_at: '2026-02-06T20:04:53.000Z',
          created_at: '2026-02-05T16:11:01.000Z',
          updated_at: '2026-02-06T14:04:53.000Z',
        },
        'promotions-engine-api': {
          id: 2,
          app_key: 'promotions-engine-api',
          client_id: '382706031020831',
          access_token: 'APP_USR-...',
          refresh_token: 'TG-...',
          expires_in: 21600,
          expires_at: '2026-04-07T02:00:59.017Z',
          created_at: '2026-04-06T20:00:59.000Z',
          updated_at: '2026-04-06T20:00:59.000Z',
        },
      },
    },
  })
  async getToken(
    @Query('appKey') appKey = 'default',
    @Query('all') all?: string,
  ) {
    if (all === 'true') {
      return this.service.getAllTokens();
    }

    return this.service.getToken(appKey);
  }
}
