import { Module } from '@nestjs/common';
import { InternalApiKeyGuard } from 'src/app/guards/InternalApiKeyGuard';
import { GetProductsDetailModule } from 'src/app/modules/products/get/GetProductsDetail.Module';
import { MeliProductDeleteQueueController } from './meli-product-delete-queue.controller';
import { MeliProductDeleteQueueService } from './meli-product-delete-queue.service';
import { MeliProductDeleteWorkerService } from './meli-product-delete-worker.service';

@Module({
  imports: [GetProductsDetailModule],
  controllers: [MeliProductDeleteQueueController],
  providers: [
    MeliProductDeleteQueueService,
    MeliProductDeleteWorkerService,
    InternalApiKeyGuard,
  ],
  exports: [MeliProductDeleteQueueService],
})
export class MeliProductDeleteQueueModule {}
