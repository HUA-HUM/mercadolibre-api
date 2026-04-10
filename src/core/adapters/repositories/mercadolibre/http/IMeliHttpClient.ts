import { AxiosRequestConfig } from 'axios';

export interface MeliRequestConfig extends AxiosRequestConfig {
  appKey?: string;
}

export interface IMeliHttpClient {
  get<T>(path: string, config?: MeliRequestConfig): Promise<T | null>;
  post<T>(
    path: string,
    body: unknown,
    config?: MeliRequestConfig,
  ): Promise<T | null>;
  delete<T>(path: string, config?: MeliRequestConfig): Promise<T | null>;
}
