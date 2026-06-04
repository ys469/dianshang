export enum FulfillmentMode {
  Delivery = 'delivery',
  Pickup = 'pickup'
}

export enum OrderStatus {
  PendingPayment = 'pending_payment',
  PendingShipment = 'pending_shipment',
  PendingPickup = 'pending_pickup',
  PendingReceipt = 'pending_receipt',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Refunding = 'refunding'
}

export enum HomeSectionType {
  GuessLike = 'guess_like',
  FlashSale = 'flash_sale',
  GroupBuying = 'group_buying',
  MemberExclusive = 'member_exclusive',
  HotProducts = 'hot_products'
}
