import { MeliToken } from 'src/core/entitis/madre/mercadolibre/token/MeliToken';

export interface IMadreMeliTokenRepository {
  getToken(appKey?: string): Promise<MeliToken | null>;
  saveToken(token: MeliToken, appKey?: string): Promise<void>;
  updateToken(token: MeliToken, appKey?: string): Promise<void>;
}
