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
import { isValidInternalApiKey } from './app/guards/InternalApiKeyGuard';
import { createDocsSiteRouter } from './app/infra/docs/docs-site.router';

const BULL_BOARD_PATH = '/admin/queues';
const SWAGGER_PATH = '/api/docs';

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

  if (isValidInternalApiKey(request.headers['x-internal-api-key'], apiKey)) {
    next();
    return;
  }

  const [scheme, encodedCredentials] =
    request.headers.authorization?.split(' ') ?? [];

  if (scheme === 'Basic' && encodedCredentials) {
    const [, password] = Buffer.from(encodedCredentials, 'base64')
      .toString('utf8')
      .split(':');

    if (isValidInternalApiKey(password, apiKey)) {
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
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  const queueService = app.get(MeliProductDeleteQueueService);
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_PATH);

  createBullBoard({
    queues: [new BullMQAdapter(queueService.getQueue())],
    serverAdapter,
  });

  app.use(BULL_BOARD_PATH, bullBoardAuth, serverAdapter.getRouter());

  if (readBooleanEnv('DOCS_SITE_ENABLED', true)) {
    const docsPath = readOptionalEnv('DOCS_SITE_PATH') ?? '/docs';
    const username = readOptionalEnv('DOCS_SITE_USER');
    const password = readOptionalEnv('DOCS_SITE_PASSWORD');

    // With both set the site asks for them and publishes every page; without
    // them it is open and leaves out the page about the server. The markdown
    // is read from the repository checkout the service runs from.
    app.use(
      docsPath,
      createDocsSiteRouter({
        basePath: docsPath,
        rootDirectory: process.cwd(),
        credentials:
          username !== undefined && password !== undefined
            ? { username, password }
            : undefined,
      }),
    );
  }

  await app.listen(Number(process.env.APP_PORT ?? 8080));
}
void bootstrap();

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const rawValue = readOptionalEnv(name);
  if (rawValue === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'y'].includes(rawValue.toLowerCase());
}
