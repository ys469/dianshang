import type { FulfillmentMode, HomeSectionType, OrderStatus } from './enums';

export interface DemoCategory {
  id: string;
  name: string;
  icon: string;
}

export interface DemoProduct {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string;
  price: number;
  memberPrice: number;
  marketPrice: number;
  stock: number;
  sales: number;
  image: string;
  tags: string[];
  isFeatured: boolean;
}

export interface DemoHomeSection {
  id: string;
  type: HomeSectionType;
  title: string;
  productIds: string[];
}

export interface DemoOrder {
  id: string;
  orderNo: string;
  status: OrderStatus;
  fulfillmentMode: FulfillmentMode;
  totalAmount: number;
  productIds: string[];
}
