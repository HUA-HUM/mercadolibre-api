import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { NextFunction, Request, Response } from 'express';
import { swaggerConfig } from './config/swagger.config';
import { AppModule } from './app/modules/app.module';
import { MeliProductDeleteQueueService } from './app/infra/queues/meli-product-delete-queue.service';

const BULL_BOARD_PATH = '/admin/queues';

const bullBoardAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    response.status(503).send('INTERNAL_API_KEY is not configured');
    return;
  }

  if (request.headers['x-internal-api-key'] === apiKey) {
    next();
    return;
  }

  const [scheme, encodedCredentials] =
    request.headers.authorization?.split(' ') ?? [];

  if (scheme === 'Basic' && encodedCredentials) {
    const [, password] = Buffer.from(encodedCredentials, 'base64')
      .toString('utf8')
      .split(':');

    if (password === apiKey) {
      next();
      return;
    }
  }

  response.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
  response.status(401).send('Unauthorized');
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const queueService = app.get(MeliProductDeleteQueueService);
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_PATH);

  createBullBoard({
    queues: [new BullMQAdapter(queueService.getQueue())],
    serverAdapter,
  });

  app.use(BULL_BOARD_PATH, bullBoardAuth, serverAdapter.getRouter());

  await app.listen(Number(process.env.APP_PORT ?? 8080));
}
void bootstrap();
