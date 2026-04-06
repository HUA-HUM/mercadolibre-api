import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IMadreMeliTokenRepository } from 'src/core/adapters/repositories/madre/mercadolibre/token/IMadreMeliTokenRepository';
import type { IMeliAuthRepository } from 'src/core/adapters/repositories/mercadolibre/auth/IMeliAuthRepository';
import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

@Injectable()
export class GetValidMeliAccessTokenInteractor {
  private readonly refreshThresholdSeconds = 300;

  constructor(
    @Inject('IMadreMeliTokenRepository')
    private readonly tokenRepository: IMadreMeliTokenRepository,

    @Inject('IMeliAuthRepository')
    private readonly authRepository: IMeliAuthRepository,
  ) {}

  async execute(appKey = 'default'): Promise<string> {
    const token = await this.tokenRepository.getToken(appKey);

    if (!token) {
      throw new UnauthorizedException(
        `MercadoLibre token not found for app "${appKey}". Reauthorize application.`,
      );
    }

    if (this.isTokenValid(token)) {
      console.log(`[MELI TOKEN] using cached token for app "${appKey}"`);
      return token.access_token;
    }

    console.warn(`[MELI TOKEN] token expired for app "${appKey}" → refreshing`);

    const refreshed = await this.authRepository.refreshToken(
      token.refresh_token,
      appKey,
    );

    if (
      !refreshed ||
      !refreshed.access_token ||
      !refreshed.refresh_token ||
      typeof refreshed.expires_in !== 'number'
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token response from MercadoLibre. Reauthorize application.',
      );
    }

    await this.tokenRepository.updateToken({
      app_key: appKey,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_in: refreshed.expires_in,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
    }, appKey);

    console.log(`[MELI TOKEN] token refreshed and stored for app "${appKey}"`);

    return refreshed.access_token;
  }

  private isTokenValid(token: MeliToken): boolean {
    const now = Date.now();
    const expiresAt = new Date(token.expires_at).getTime();

    return now < expiresAt - this.refreshThresholdSeconds * 1000;
  }
}
