import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Injectable } from '@nestjs/common';
import { GetValidMeliAccessTokenInteractor } from 'src/core/interactors/GetValidMeliAccessTokenInteractor';
import type {
  MeliDeleteResponse,
  MeliRequestConfig,
} from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { MeliHttpErrorHandler } from './error/meliHttpError';

const maskToken = (token: string): string =>
  `${token.slice(0, 18)}...${token.slice(-14)}`;

@Injectable()
export class MeliHttpClient {
  private readonly client: AxiosInstance;

  constructor(private readonly getToken: GetValidMeliAccessTokenInteractor) {
    this.client = axios.create({
      baseURL: 'https://api.mercadolibre.com',
      timeout: 5000,
    });
  }

  async get<T>(url: string, config?: MeliRequestConfig): Promise<T | null> {
    try {
      const token = await this.getToken.execute(config?.appKey);

      const response = await this.client.get<T>(url, {
        ...this.toAxiosConfig(config),
        headers: {
          Authorization: `Bearer ${token}`,
          ...(config?.headers ?? {}),
        },
      });

      return response.data;
    } catch (error) {
      return MeliHttpErrorHandler.handle(error);
    }
  }

  async post<T>(
    url: string,
    body: unknown,
    config?: MeliRequestConfig,
  ): Promise<T | null> {
    try {
      const token = await this.getToken.execute(config?.appKey);

      const response = await this.client.post<T>(url, body, {
        ...this.toAxiosConfig(config),
        headers: {
          Authorization: `Bearer ${token}`,
          ...(config?.headers ?? {}),
        },
      });

      return response.data;
    } catch (error) {
      return MeliHttpErrorHandler.handle(error);
    }
  }

  async delete<T>(url: string, config?: MeliRequestConfig): Promise<T | null> {
    const response = await this.deleteWithMeta<T>(url, config);
    return response?.data ?? null;
  }

  async deleteWithMeta<T>(
    url: string,
    config?: MeliRequestConfig,
  ): Promise<MeliDeleteResponse<T> | null> {
    try {
      const token = await this.getToken.execute(config?.appKey);

      console.log('[MELI HTTP DELETE] request', {
        appKey: config?.appKey ?? 'default',
        url,
        token: maskToken(token),
      });

      const response = await this.client.delete<T>(url, {
        ...this.toAxiosConfig(config),
        validateStatus: (status) => status < 500,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(config?.headers ?? {}),
        },
      });

      return {
        status: response.status,
        data: response.data === '' ? null : (response.data ?? null),
      };
    } catch (error) {
      return MeliHttpErrorHandler.handle(error);
    }
  }

  private toAxiosConfig(config?: MeliRequestConfig): AxiosRequestConfig | undefined {
    if (!config) {
      return undefined;
    }

    const { appKey: _appKey, ...axiosConfig } = config;
    return axiosConfig;
  }
}
