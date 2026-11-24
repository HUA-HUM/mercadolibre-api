import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MeliRateLimitFilter } from '../filters/MeliRateLimitFilter';
import { InternalApiKeyGuard } from '../guards/InternalApiKeyGuard';
import { MeliHttpModule } from './http/meli-http.module';
import { GetProductsModule } from './products/get/GetProducts.Module';
import { MeliVisitsModule } from './metrics/products/visits/meli-visits.module';
import { GetMeliTokenModule } from './token/GetMeliToken.Module';
import { MeliOrdersModule } from './orders/MeliOrders.Module';
import { MeliCategoriesModule } from './categories/MeliCategories.Module';
import { GetProductsDetailModule } from './products/get/GetProductsDetail.Module';
import { SellerPromotionsModule } from './promotions/SellerPromotions.Module';
import { MeliProductDeleteQueueModule } from '../infra/queues/meli-product-delete-queue.module';

@Module({
  imports: [
    // 🌍 Env vars globales
    ConfigModule.forRoot({ isGlobal: true }),

    // 🌐 Infra MercadoLibre (HTTP + token válido)
    MeliHttpModule,

    // 📦 Endpoints (todos protegidos por API key interna)
    GetProductsModule,
    MeliVisitsModule,
    MeliOrdersModule,
    MeliCategoriesModule,
    GetProductsDetailModule,
    SellerPromotionsModule,
    MeliProductDeleteQueueModule,

    // 🔐 Endpoints internos
    GetMeliTokenModule,
  ],
  providers: [
    // 🔐 Todos los endpoints requieren x-internal-api-key
    { provide: APP_GUARD, useClass: InternalApiKeyGuard },
    // ⏳ 429 de Mercado Libre → 429 al cliente con Retry-After
    { provide: APP_FILTER, useClass: MeliRateLimitFilter },
  ],
})
export class AppModule {}
