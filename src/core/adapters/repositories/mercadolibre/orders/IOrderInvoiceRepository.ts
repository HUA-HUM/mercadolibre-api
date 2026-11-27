export interface InvoiceFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface OrderInvoiceTarget {
  orderId: string;
  /** Where Mercado Libre keeps the invoice: the cart, or the order itself when it has no cart. */
  packId: string;
}

export interface IOrderInvoiceRepository {
  /** Null when Mercado Libre has no sale with that id for the account. */
  resolveTarget(orderId: string): Promise<OrderInvoiceTarget | null>;
  /** What Mercado Libre has attached to the cart. Null when there is nothing. */
  listInvoices(packId: string): Promise<unknown>;
  uploadInvoice(packId: string, files: InvoiceFile[]): Promise<unknown>;
}
