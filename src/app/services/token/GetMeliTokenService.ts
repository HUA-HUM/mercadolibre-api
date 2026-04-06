import { Inject, Injectable } from '@nestjs/common';
import type { IMadreMeliTokenRepository } from 'src/core/adapters/repositories/madre/mercadolibre/token/IMadreMeliTokenRepository';
import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

const KNOWN_APP_KEYS = ['default', 'promotions-engine-api'] as const;

@Injectable()
export class GetMeliTokenService {
  constructor(
    @Inject('IMadreMeliTokenRepository')
    private readonly tokenRepo: IMadreMeliTokenRepository,
  ) {}

  async getToken(appKey = 'default'): Promise<MeliToken | null> {
    return this.tokenRepo.getToken(appKey);
  }

  async getAllTokens(): Promise<Record<string, MeliToken | null>> {
    const entries = await Promise.all(
      KNOWN_APP_KEYS.map(async (appKey) => [
        appKey,
        await this.tokenRepo.getToken(appKey),
      ]),
    );

    return Object.fromEntries(entries);
  }
}
