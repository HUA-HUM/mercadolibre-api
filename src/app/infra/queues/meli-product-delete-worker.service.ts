import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { GetMeliProductDetailService } from 'src/app/services/products/get/GetMeliProductDetailService';
import {
  DeleteMeliProductJobData,
  MELI_PRODUCT_DELETE_QUEUE,
} from './meli-product-delete.queue';
import { createRedisConnection } from './redis-connection';

@Injectable()
export class MeliProductDeleteWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MeliProductDeleteWorkerService.name);
  private worker?: Worker<DeleteMeliProductJobData>;

  constructor(
    private readonly productDetailService: GetMeliProductDetailService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<DeleteMeliProductJobData>(
      MELI_PRODUCT_DELETE_QUEUE,
      async (job) => this.processJob(job),
      {
        connection: createRedisConnection(),
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Deleted Meli item ${job.data.itemId}`, {
        jobId: job.id,
        batchId: job.data.batchId,
        appKey: job.data.appKey,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Failed to delete Meli item ${job?.data.itemId}`, {
        jobId: job?.id,
        batchId: job?.data.batchId,
        appKey: job?.data.appKey,
        attemptsMade: job?.attemptsMade,
        message: error.message,
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(job: Job<DeleteMeliProductJobData>) {
    const result = await this.productDetailService.deleteProduct(
      job.data.itemId,
      job.data.appKey,
    );

    if (!result) {
      throw new Error(`Meli product ${job.data.itemId} not found`);
    }

    return result;
  }
}
