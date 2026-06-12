export const MELI_PRODUCT_DELETE_QUEUE = 'meli-product-delete';

export interface DeleteMeliProductJobData {
  itemId: string;
  appKey: string;
  batchId: string;
}
