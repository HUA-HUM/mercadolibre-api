import { Module } from '@nestjs/common';
import { GetOrdersService } from 'src/app/services/orders/GetOrdersService';
import { MeliHttpModule } from '../http/meli-http.module';
import { MeliOrdersController } from 'src/app/controllers/orders/MeliOrders.Controller';
import { GetOrderDetailService } from 'src/app/services/orders/GetOrderDetailService';
import { GetOrderDetailRepository } from 'src/core/drivers/repositories/mercadolibre/orders/GetOrderDetailRepository';
import { MeliOrderInvoiceController } from 'src/app/controllers/orders/MeliOrderInvoice.Controller';
import { OrderInvoiceService } from 'src/app/services/orders/OrderInvoiceService';
import { OrderInvoiceRepository } from 'src/core/drivers/repositories/mercadolibre/orders/OrderInvoiceRepository';
import { GetOrdersRepository } from 'src/core/drivers/repositories/mercadolibre/orders/GetOrdersRepository';

@Module({
  imports: [MeliHttpModule],
  controllers: [MeliOrdersController, MeliOrderInvoiceController],
  providers: [
    GetOrdersService,
    GetOrderDetailService,
    OrderInvoiceService,
    {
      provide: 'IOrderInvoiceRepository',
      useClass: OrderInvoiceRepository,
    },
    {
      provide: 'IGetOrderDetailRepository',
      useClass: GetOrderDetailRepository,
    },
    {
      provide: 'IGetOrdersRepository',
      useClass: GetOrdersRepository,
    },
  ],
  exports: [GetOrdersService],
})
export class MeliOrdersModule {}
