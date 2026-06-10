import { AxiosRequestConfig } from 'axios';

export interface MeliRequestConfig extends AxiosRequestConfig {
  appKey?: string;
}

export interface MeliDeleteResponse<T> {
  status: number;
  data: T | null;
}

export type MeliPutResponse<T> = MeliDeleteResponse<T>;

export interface IMeliHttpClient {
  get<T>(path: string, config?: MeliRequestConfig): Promise<T | null>;
  post<T>(
    path: string,
    body: unknown,
    config?: MeliRequestConfig,
  ): Promise<T | null>;
  put<T>(
    path: string,
    body: unknown,
    config?: MeliRequestConfig,
  ): Promise<T | null>;
  putWithMeta<T>(
    path: string,
    body: unknown,
    config?: MeliRequestConfig,
  ): Promise<MeliPutResponse<T> | null>;
  delete<T>(path: string, config?: MeliRequestConfig): Promise<T | null>;
  deleteWithMeta<T>(
    path: string,
    config?: MeliRequestConfig,
  ): Promise<MeliDeleteResponse<T> | null>;
}
