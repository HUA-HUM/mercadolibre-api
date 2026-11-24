export interface IGetProductsVisitRepository {
  getVisitsById(itemId: string): Promise<number | null>;
  /** Devuelve un mapa itemId → total de visitas (los ids sin datos se omiten). */
  getVisitsByIds(itemIds: string[]): Promise<Record<string, number>>;
}
