import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('MercadoLibre API')
  .setDescription(
    `
API interna para integraciones con Mercado Libre.

Incluye:
- Gestión de tokens OAuth
- Productos del seller
- Métricas de visitas

⚠️ Todos los endpoints son **internos** y requieren el header \`x-internal-api-key\`.
    `,
  )
  .setVersion('1.0')

  // 🔐 API KEY INTERNA
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-internal-api-key',
      in: 'header',
      description: 'API Key interna para endpoints protegidos',
    },
    'x-internal-api-key',
  )
  .addSecurityRequirements('x-internal-api-key')

  .build();
