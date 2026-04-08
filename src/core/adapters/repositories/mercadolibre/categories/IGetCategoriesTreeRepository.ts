import { Category } from 'src/core/entitis/mercadolibre/categories/Category';
import { MeliCategoryRaw } from 'src/core/entitis/mercadolibre/categories/MeliCategoryRaw';

export interface IGetCategoriesTreeRepository {
  getRootCategories(): Promise<{ id: string; name: string }[]>;
  getCategoryById(categoryId: string): Promise<Category>;
  getRawCategoryById(categoryId: string): Promise<MeliCategoryRaw | null>;
}
