import { Inject, Injectable } from '@nestjs/common';
import type { IMeliHttpClient } from 'src/core/adapters/repositories/mercadolibre/http/IMeliHttpClient';
import { IGetCategoriesTreeRepository } from 'src/core/adapters/repositories/mercadolibre/categories/IGetCategoriesTreeRepository';
import { Category } from 'src/core/entitis/mercadolibre/categories/Category';
import { MeliCategoryRaw } from 'src/core/entitis/mercadolibre/categories/MeliCategoryRaw';

@Injectable()
export class GetCategoriesTreeRepository implements IGetCategoriesTreeRepository {
  constructor(
    @Inject('IMeliHttpClient')
    private readonly meliHttpClient: IMeliHttpClient,
  ) {}

  async getRootCategories(): Promise<{ id: string; name: string }[]> {
    const roots = await this.meliHttpClient.get<any[]>('/sites/MLA/categories');

    if (!roots) return [];

    return roots.map((r) => ({
      id: r.id,
      name: r.name,
    }));
  }

  async getCategoryById(categoryId: string): Promise<Category> {
    const category = await this.getRawCategoryById(categoryId);

    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    return {
      id: category.id ?? categoryId,
      name: category.name ?? '',
      picture: category.picture,
      permalink: category.permalink ?? undefined,
      totalItems: category.total_items_in_this_category,

      pathFromRoot: category.path_from_root?.map((p: any) => ({
        id: p.id,
        name: p.name,
      })),

      children:
        category.children_categories?.map((child: any) => ({
          id: child.id,
          name: child.name,
          totalItems: child.total_items_in_this_category,
        })) ?? [],
    };
  }

  async getRawCategoryById(categoryId: string): Promise<MeliCategoryRaw | null> {
    return this.meliHttpClient.get<MeliCategoryRaw | null>(
      `/categories/${categoryId}`,
    );
  }
}
