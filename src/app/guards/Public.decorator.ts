import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint (o controller) como accesible sin x-internal-api-key.
 * Usar solo para datos que ya son públicos en Mercado Libre.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
