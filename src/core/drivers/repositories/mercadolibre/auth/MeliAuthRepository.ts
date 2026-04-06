import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { MeliConfig } from '../config/MeliConfig';
import { IMeliAuthRepository } from 'src/core/adapters/repositories/mercadolibre/auth/IMeliAuthRepository';
import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

interface MeliRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class MeliAuthRepository implements IMeliAuthRepository {
  async refreshToken(refreshToken: string, appKey = 'default'): Promise<MeliToken> {
    const authConfig = MeliConfig.getAuthConfig(appKey);

    const response = await axios.post<MeliRefreshResponse>(
      authConfig.url,
      {
        grant_type: 'refresh_token',
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret,
        refresh_token: refreshToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: MeliConfig.api.timeout,
      },
    );

    const { access_token, refresh_token, expires_in } = response.data;

    return {
      app_key: appKey,
      access_token,
      refresh_token,
      expires_in,
      expires_at: new Date(Date.now() + expires_in * 1000),
    };
  }
}
