import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MeliCategoriesController } from 'src/app/controllers/categories/MeliCategories.Controller';
import { GetProductsDetailController } from 'src/app/controllers/products/get/GetProductsDetail.Controller';
import { GetCategoriesTreeService } from 'src/app/services/categories/GetCategoriesTreeService';
import { GetMeliProductDetailService } from 'src/app/services/products/get/GetMeliProductDetailService';
import { InternalApiKeyGuard } from './InternalApiKeyGuard';

describe('Public routes vs protected routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = 'secret-key';

    const moduleRef = await Test.createTestingModule({
      controllers: [MeliCategoriesController, GetProductsDetailController],
      providers: [
        { provide: APP_GUARD, useClass: InternalApiKeyGuard },
        {
          provide: GetCategoriesTreeService,
          useValue: {
            getRootCategories: async () => [{ id: 'MLA1', name: 'Root' }],
            getRawCategoryById: async () => ({ id: 'MLA1' }),
          },
        },
        {
          provide: GetMeliProductDetailService,
          useValue: {
            getDescription: async () => ({ plain_text: 'desc' }),
            execute: async () => ({ id: 'MLA1' }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves categories without a key (used by madre-api / madre-ai-matcher)', async () => {
    await request(app.getHttpServer()).get('/meli/categories').expect(200);
    await request(app.getHttpServer())
      .get('/meli/categories/MLA1/raw')
      .expect(200);
  });

  it('serves item descriptions without a key (used by madre-api)', async () => {
    await request(app.getHttpServer())
      .get('/meli/products/MLA1/description')
      .expect(200);
  });

  it('still protects product detail', async () => {
    await request(app.getHttpServer()).get('/meli/products/MLA1').expect(401);
    await request(app.getHttpServer())
      .get('/meli/products/MLA1')
      .set('x-internal-api-key', 'secret-key')
      .expect(200);
  });
});
