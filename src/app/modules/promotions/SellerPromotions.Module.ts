import { Module } from '@nestjs/common';
import { SellerPromotionsController } from 'src/app/controllers/promotions/SellerPromotions.Controller';
import { MeliHttpModule } from '../http/meli-http.module';
import { GetSellerPromotionsService } from 'src/app/services/promotions/GetSellerPromotionsService';
import { SellerPromotionsRepository } from 'src/core/drivers/repositories/mercadolibre/promotions/SellerPromotionsRepository';

@Module({
  imports: [MeliHttpModule],
  controllers: [SellerPromotionsController],
  providers: [
    GetSellerPromotionsService,
    {
      provide: 'ISellerPromotionsRepository',
      useClass: SellerPromotionsRepository,
    },
  ],
  exports: [GetSellerPromotionsService],
})
export class SellerPromotionsModule {}
