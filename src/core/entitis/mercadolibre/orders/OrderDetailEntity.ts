/**
 * Full detail of one Mercado Libre sale, gathered from /orders/{id},
 * /orders/{id}/billing_info, /orders/{id}/discounts, /shipments/{id} and
 * /shipments/{id}/costs. Amounts are in `currencyId`.
 */
export interface OrderDetailEntity {
  id: number;
  /** Cart the sale belongs to. Null when the buyer bought a single product. */
  packId: number | null;
  status: string;
  statusDetail: string | null;
  dateCreated: string;
  dateClosed: string | null;
  lastUpdated: string | null;
  currencyId: string;
  /** Sum of the products at the price charged (after seller discounts). */
  totalAmount: number;
  /** What the buyer paid, shipping and financing included. */
  paidAmount: number;
  tags: string[];
  items: OrderDetailItem[];
  payments: OrderDetailPayment[];
  discounts: OrderDetailDiscount[];
  buyer: OrderDetailBuyer;
  shipping: OrderDetailShipping | null;
}

export interface OrderDetailItem {
  itemId: string;
  title: string;
  categoryId: string | null;
  variationId: number | null;
  sellerSku: string | null;
  quantity: number;
  /** Price charged per unit, after seller discounts. */
  unitPrice: number;
  /** List price per unit before discounts. Null when Mercado Libre omits it. */
  grossPrice: number | null;
  /** Mercado Libre commission per unit. */
  saleFee: number | null;
  listingTypeId: string | null;
}

export interface OrderDetailPayment {
  id: number;
  status: string;
  statusDetail: string | null;
  paymentMethodId: string | null;
  paymentType: string | null;
  installments: number | null;
  installmentAmount: number | null;
  transactionAmount: number;
  transactionAmountRefunded: number;
  taxesAmount: number;
  shippingCost: number;
  couponAmount: number;
  totalPaidAmount: number;
  marketplaceFee: number;
  dateApproved: string | null;
}

export interface OrderDetailDiscount {
  type: string;
  /** Who pays for it: `seller`, `meli` or `co_funded`. */
  fundingMode: string | null;
  offerId: string | null;
  itemId: string | null;
  quantity: number | null;
  /** Total discount and the part each side funds. */
  amounts: { total: number; seller: number | null; meli: number | null };
}

export interface OrderDetailBuyer {
  id: number | null;
  nickname: string | null;
  /** Null when Mercado Libre did not return billing data. */
  billing: OrderDetailBilling | null;
}

export interface OrderDetailBilling {
  firstName: string | null;
  lastName: string | null;
  /** `DNI`, `CUIT`, … */
  identificationType: string | null;
  identificationNumber: string | null;
  /** AFIP condition as Mercado Libre reports it, e.g. `05` Consumidor Final, `01` IVA Responsable Inscripto. */
  taxpayerType: { id: string | null; description: string | null } | null;
  /** `CO` consumer, `BU` business. */
  customerType: string | null;
  address: {
    streetName: string | null;
    streetNumber: string | null;
    cityName: string | null;
    stateCode: string | null;
    stateName: string | null;
    zipCode: string | null;
    countryId: string | null;
  } | null;
}

export interface OrderDetailShipping {
  id: number;
  status: string | null;
  substatus: string | null;
  /** `me2`, `me1`, `custom`, … */
  mode: string | null;
  /** `fulfillment`, `xd_drop_off`, `cross_docking`, `self_service`, … */
  logisticType: string | null;
  trackingNumber: string | null;
  trackingMethod: string | null;
  declaredValue: number | null;
  dateCreated: string | null;
  /** Null when Mercado Libre did not return the costs. */
  costs: {
    /** List cost of the shipment, before anyone's discounts. */
    grossAmount: number | null;
    /** What the buyer paid for shipping. */
    buyerCost: number | null;
    /** What the seller pays for shipping. */
    sellerCost: number | null;
  } | null;
}

/** A cart: several sales the buyer paid together, shipped as one. */
export interface PackDetailEntity {
  id: number;
  status: string | null;
  shippingId: number | null;
  dateCreated: string | null;
  orders: OrderDetailEntity[];
}
