import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

export interface IMeliAuthRepository {
  refreshToken(refreshToken: string, appKey?: string): Promise<MeliToken>;
}
