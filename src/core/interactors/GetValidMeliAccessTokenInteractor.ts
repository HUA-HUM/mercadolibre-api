import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IMadreMeliTokenRepository } from 'src/core/adapters/repositories/madre/mercadolibre/token/IMadreMeliTokenRepository';
import type { IMeliAuthRepository } from 'src/core/adapters/repositories/mercadolibre/auth/IMeliAuthRepository';
import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

const maskToken = (token: string): string =>
  `${token.slice(0, 18)}...${token.slice(-14)}`;

@Injectable()
export class GetValidMeliAccessTokenInteractor {
  private readonly refreshThresholdSeconds = 300;

  // Un único refresh en vuelo por appKey: Mercado Libre invalida el
  // refresh_token al usarlo, así que dos refresh concurrentes rompen el segundo.
  private readonly inFlightRefresh = new Map<string, Promise<string>>();

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
      return token.access_token;
    }

    const pending = this.inFlightRefresh.get(appKey);
    if (pending) {
      return pending;
    }

    const refresh = this.refresh(token, appKey).finally(() => {
      this.inFlightRefresh.delete(appKey);
    });
    this.inFlightRefresh.set(appKey, refresh);

    return refresh;
  }

  private async refresh(token: MeliToken, appKey: string): Promise<string> {
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

    await this.tokenRepository.updateToken(
      {
        app_key: appKey,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_in: refreshed.expires_in,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
      },
      appKey,
    );

    console.log(`[MELI TOKEN] token refreshed and stored for app "${appKey}"`, {
      token: maskToken(refreshed.access_token),
      expires_at: refreshed.expires_at,
    });

    return refreshed.access_token;
  }

  private isTokenValid(token: MeliToken): boolean {
    const now = Date.now();
    const expiresAt = new Date(token.expires_at).getTime();

    return now < expiresAt - this.refreshThresholdSeconds * 1000;
  }
}
