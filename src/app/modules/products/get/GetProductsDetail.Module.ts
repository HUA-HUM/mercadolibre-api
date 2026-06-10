import { Module } from '@nestjs/common';
import { GetProductsDetailController } from 'src/app/controllers/products/get/GetProductsDetail.Controller';
import { GetMeliProductDetailService } from 'src/app/services/products/get/GetMeliProductDetailService';
import { MeliHttpClient } from 'src/core/drivers/repositories/mercadolibre/http/MeliHttpClient';
import { MeliProductDetailRepository } from 'src/core/drivers/repositories/mercadolibre/products/get/MeliProductDetailRepository';
import { InternalApiKeyGuard } from 'src/app/guards/InternalApiKeyGuard';

@Module({
  controllers: [GetProductsDetailController],
  providers: [
    GetMeliProductDetailService,
    InternalApiKeyGuard,

    // Repository binding
    {
      provide: 'IMeliProductDetailRepository',
      useClass: MeliProductDetailRepository,
    },

    // HTTP client binding
    {
      provide: 'IMeliHttpClient',
      useClass: MeliHttpClient,
    },
  ],
  exports: [GetMeliProductDetailService],
})
export class GetProductsDetailModule {}
