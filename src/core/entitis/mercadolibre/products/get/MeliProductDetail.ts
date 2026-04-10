export interface MeliProductDetail {
  id: string;
  categoryId: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  soldQuantity: number;
  status: string;
  condition: string;
  buyingMode: string;
  listingTypeId: string;
  permalink: string;
  thumbnailId: string;
  thumbnail: string;
  pictures: string[];
  sellerSku?: string;
  brand?: string;
  warranty?: string;
  freeShipping: boolean;
  health: number;
  lastUpdated: string;
  description?: string;
}
