import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  DeleteMeliProductJobData,
  MELI_PRODUCT_DELETE_QUEUE,
} from './meli-product-delete.queue';
import { createRedisConnection } from './redis-connection';

export interface EnqueueDeleteMeliProductsParams {
  itemIds: string[];
  appKey?: string;
}

export interface EnqueueDeleteMeliProductsResult {
  batchId: string;
  queued: number;
  appKey: string;
  jobs: {
    itemId: string;
    jobId: string;
  }[];
}

@Injectable()
export class MeliProductDeleteQueueService implements OnModuleDestroy {
  private readonly queue = new Queue<DeleteMeliProductJobData>(
    MELI_PRODUCT_DELETE_QUEUE,
    {
      connection: createRedisConnection(),
      defaultJobOptions: this.getDefaultJobOptions(),
    },
  );

  async enqueueBulkDelete(
    params: EnqueueDeleteMeliProductsParams,
  ): Promise<EnqueueDeleteMeliProductsResult> {
    const appKey = params.appKey ?? 'default';
    const batchId = randomUUID();
    const uniqueItemIds = [
      ...new Set(params.itemIds.map((id) => id.trim())),
    ].filter(Boolean);

    const jobs = await this.queue.addBulk(
      uniqueItemIds.map((itemId) => ({
        name: 'delete-meli-product',
        data: {
          itemId,
          appKey,
          batchId,
        },
        opts: {
          jobId: `${batchId}-${itemId}`,
        },
      })),
    );

    return {
      batchId,
      queued: jobs.length,
      appKey,
      jobs: jobs.map((job) => ({
        itemId: job.data.itemId,
        jobId: String(job.id),
      })),
    };
  }

  getQueue(): Queue<DeleteMeliProductJobData> {
    return this.queue;
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  private getDefaultJobOptions(): JobsOptions {
    return {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30_000,
      },
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 14 * 24 * 60 * 60,
        count: 5000,
      },
    };
  }
}
