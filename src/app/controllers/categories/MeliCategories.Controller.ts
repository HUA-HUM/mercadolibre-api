import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { GetCategoriesTreeService } from 'src/app/services/categories/GetCategoriesTreeService';
import { Category } from 'src/core/entitis/mercadolibre/categories/Category';
import { MeliCategoryRaw } from 'src/core/entitis/mercadolibre/categories/MeliCategoryRaw';

@ApiTags('MercadoLibre - Categories')
@Controller('meli/categories')
export class MeliCategoriesController {
  constructor(private readonly service: GetCategoriesTreeService) {}

  // 🔹 Nivel 1 solamente (categorías padre)
  @Get()
  @ApiOperation({
    summary: 'Obtiene las categorías raíz (nivel 1)',
    description: `
Devuelve únicamente las categorías principales del site **MLA**.
No incluye subcategorías.
    `,
  })
  @ApiOkResponse({
    description: 'Listado de categorías padre',
    schema: {
      example: [
        { id: 'MLA5725', name: 'Accesorios para Vehículos' },
        { id: 'MLA1512', name: 'Agro' },
        { id: 'MLA1403', name: 'Alimentos y Bebidas' },
      ],
    },
  })
  getRootCategories() {
    return this.service.getRootCategories();
  }

  // 🔹 Categoría puntual (con hijos directos)
  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene una categoría por ID',
    description: `
Devuelve la categoría solicitada junto con sus subcategorías directas.
    `,
  })
  @ApiParam({
    name: 'id',
    example: 'MLA5725',
  })
  getCategory(@Param('id') id: string): Promise<Category> {
    return this.service.getCategoryById(id);
  }

  @Get(':id/raw')
  @ApiOperation({
    summary: 'Obtiene la categoría cruda por ID',
    description:
      'Devuelve la respuesta original de Mercado Libre para /categories/:id usando el token default.',
  })
  @ApiParam({
    name: 'id',
    example: 'MLA1055',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta original de la categoría',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  async getRawCategory(@Param('id') id: string): Promise<MeliCategoryRaw> {
    const category = await this.service.getRawCategoryById(id);

    if (!category) {
      throw new Error(`Category ${id} not found`);
    }

    return category;
  }
}
