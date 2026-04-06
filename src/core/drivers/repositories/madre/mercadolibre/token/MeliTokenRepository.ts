import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import type { IMadreHttpClient } from 'src/core/adapters/repositories/madre/http/IMadreHttpClient';
import { IMadreMeliTokenRepository } from 'src/core/adapters/repositories/madre/mercadolibre/token/IMadreMeliTokenRepository';
import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

@Injectable()
export class MeliTokenRepository implements IMadreMeliTokenRepository {
  private readonly basePath = '/internal/mercadolibre/token';

  constructor(
    @Inject('IMadreHttpClient')
    private readonly httpClient: IMadreHttpClient,
  ) {}

  async getToken(appKey = 'default'): Promise<MeliToken | null> {
    try {
      return await this.httpClient.get<MeliToken | null>(
        `${this.basePath}?appKey=${encodeURIComponent(appKey)}`,
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async saveToken(token: MeliToken, appKey = 'default'): Promise<void> {
    await this.httpClient.post(this.basePath, {
      ...token,
      app_key: appKey,
    });
  }

  async updateToken(token: MeliToken, appKey = 'default'): Promise<void> {
    // 🔥 madre-api hace UPSERT con POST
    await this.httpClient.post(this.basePath, {
      ...token,
      app_key: appKey,
    });
  }
}
