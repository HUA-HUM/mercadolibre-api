import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MeliHttpModule } from './http/meli-http.module';
import { GetProductsModule } from './products/get/GetProducts.Module';
import { MeliVisitsModule } from './metrics/products/visits/meli-visits.module';
import { GetMeliTokenModule } from './token/GetMeliToken.Module';
import { MeliOrdersModule } from './orders/MeliOrders.Module';
import { MeliCategoriesModule } from './categories/MeliCategories.Module';
import { GetProductsDetailModule } from './products/get/GetProductsDetail.Module';
import { SellerPromotionsModule } from './promotions/SellerPromotions.Module';

@Module({
  imports: [
    // 🌍 Env vars globales
    ConfigModule.forRoot({ isGlobal: true }),

    // 🌐 Infra MercadoLibre (HTTP + token válido)
    MeliHttpModule,

    // 📦 Endpoints públicos
    GetProductsModule,
    MeliVisitsModule,
    MeliOrdersModule,
    MeliCategoriesModule,
    GetProductsDetailModule,
    SellerPromotionsModule,

    // 🔐 Endpoints internos
    GetMeliTokenModule,
  ],
})
export class AppModule {}
