import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  NotFoundException
} from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  banners as seedBanners,
  categories as seedCategories,
  coupons as seedCoupons,
  members as seedMembers,
  orders as seedOrders,
  products as seedProducts
} from '../../data/demo-data';

type FinanceRange = 'today' | 'week' | 'month';
type PaymentMethod = 'balance' | 'wechat';
type PaymentChannel = 'balance' | 'native' | 'h5';
type PaymentState = 'pending' | 'success' | 'failed' | 'closed';
const ORDER_CANCEL_WINDOW_MS = 3 * 60 * 1000;

interface ProductRecord {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  memberPrice: number;
  stock: number;
  sales: number;
  image: string;
  tags: string[];
  listed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderItemRecord {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  memberPrice: number;
}

interface OrderRecord {
  id: string;
  orderNo: string;
  status: string;
  paymentMethod: PaymentMethod;
  paymentState: PaymentState;
  paymentChannel: PaymentChannel | null;
  transactionId: string | null;
  paidAt: string | null;
  fulfillmentMode: 'delivery' | 'pickup';
  totalAmount: number;
  payableAmount: number;
  customerName: string;
  customerMobile: string;
  address: string;
  memberId: string | null;
  createdAt: string;
  cancelledAt: string | null;
  logisticsCompany: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  items: OrderItemRecord[];
}

interface MemberRecord {
  id: string;
  authUserId: string | null;
  nickname: string;
  mobile: string;
  memberLevel: string;
  balance: number;
  points: number;
  growthValue: number;
  coupons: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  defaultConsignee: string;
  contactMobile: string;
  defaultAddress: string;
  lastCheckInAt: string | null;
  checkinStreak: number;
}

interface RechargeRecord {
  id: string;
  rechargeNo: string;
  memberId: string;
  amount: number;
  bonusAmount: number;
  actualAmount: number;
  method: string;
  paymentMethod: PaymentMethod;
  paymentState: PaymentState;
  paymentChannel: PaymentChannel | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  type: string;
  orderNo: string;
  amount: number;
  method: string;
  createdAt: string;
  memberId: string | null;
  detail: string;
}

interface NotificationRecord {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface CouponRecord {
  id: string;
  title: string;
  threshold: number;
  discount: number;
  used: number;
  total: number;
  status: string;
  enabled: boolean;
  createdAt: string;
}

interface FlashSaleRecord {
  id: string;
  title: string;
  productId: string;
  price: number;
  stock: number;
  sold: number;
  status: string;
  enabled: boolean;
  createdAt: string;
}

interface GroupBuyRecord {
  id: string;
  title: string;
  productId: string;
  price: number;
  groupSize: number;
  completed: number;
  status: string;
  enabled: boolean;
  createdAt: string;
}

interface CheckinRuleRecord {
  day: number;
  reward: string;
  desc: string;
}

interface CreateProductInput {
  categoryId: string;
  name: string;
  subtitle?: string;
  description?: string;
  price: number;
  memberPrice: number;
  stock: number;
  tags?: string[];
  image?: string;
  listed?: boolean;
}

interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  price?: number;
  memberPrice?: number;
  stock?: number;
  tags?: string[];
  image?: string;
  listed?: boolean;
}

interface CreateOrderInput {
  fulfillmentMode: 'delivery' | 'pickup';
  paymentMethod?: PaymentMethod;
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  customerMobile: string;
  address: string;
  memberId?: string | null;
  memberLevel?: string | null;
}

interface RuntimeState {
  products: ProductRecord[];
  coupons: CouponRecord[];
  flashSales: FlashSaleRecord[];
  groupBuys: GroupBuyRecord[];
  checkinRules: CheckinRuleRecord[];
  orders: OrderRecord[];
  members: MemberRecord[];
  rechargeRecords: RechargeRecord[];
  transactions: TransactionRecord[];
  systemNotifications: NotificationRecord[];
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return date.getTime();
}

function isToday(iso: string) {
  return new Date(iso).getTime() >= startOfToday();
}

function isYesterday(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function isCurrentMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isWithinRange(iso: string, range: FinanceRange) {
  const time = new Date(iso).getTime();
  if (range === 'today') {
    return time >= startOfToday();
  }
  if (range === 'week') {
    return time >= startOfCurrentWeek();
  }
  return isCurrentMonth(iso);
}

function createIso(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function addMilliseconds(iso: string, milliseconds: number) {
  return new Date(new Date(iso).getTime() + milliseconds).toISOString();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.filter(Boolean))];
}

function mapSeedStatus(status: string, fulfillmentMode: string) {
  if (status === 'pending_payment') {
    return '待付款';
  }
  if (status === 'pending_pickup') {
    return '待提货';
  }
  if (status === 'completed') {
    return '已完成';
  }
  return fulfillmentMode === 'pickup' ? '待提货' : '待发货';
}

function getRechargeBonus(amount: number) {
  if (amount >= 1000) {
    return 200;
  }
  if (amount >= 500) {
    return 80;
  }
  if (amount >= 100) {
    return 10;
  }
  return 0;
}

@Injectable()
export class RuntimeDataService implements OnModuleInit, OnModuleDestroy {
  private readonly categories = seedCategories.map((item) => ({ ...item }));
  private readonly banners = seedBanners.map((item) => ({ ...item }));

  private products: ProductRecord[] = seedProducts.map((item) => ({
    ...item,
    subtitle: item.subtitle ?? '',
    description: '',
    tags: [...item.tags],
    listed: true,
    createdAt: createIso(15),
    updatedAt: createIso(15)
  }));

  private coupons: CouponRecord[] = this.buildSeedCoupons();
  private flashSales: FlashSaleRecord[] = this.buildSeedFlashSales();
  private groupBuys: GroupBuyRecord[] = this.buildSeedGroupBuys();
  private checkinRules: CheckinRuleRecord[] = [
    { day: 1, reward: '5 积分', desc: '连续签到 1 天' },
    { day: 3, reward: '15 积分', desc: '连续签到 3 天' },
    { day: 7, reward: '50 积分 + 优惠券', desc: '连续签到 7 天' },
    { day: 30, reward: '200 积分 + 大额优惠券', desc: '连续签到 30 天' }
  ];

  private orders: OrderRecord[] = this.buildSeedOrders();
  private members: MemberRecord[] = this.buildSeedMembers();
  private rechargeRecords: RechargeRecord[] = [];
  private transactions: TransactionRecord[] = this.buildSeedTransactions();
  private systemNotifications: NotificationRecord[] = [
    {
      id: 'notice-system-upgrade',
      title: '系统通知',
      content: '今晚 23:00-23:30 将进行商城服务升级，预计不会影响正常下单。',
      type: 'system',
      read: true,
      createdAt: createIso(1)
    }
  ];

  onModuleInit() {
    this.hydrateState();
  }

  onModuleDestroy() {
    this.persistState();
  }

  getCategories() {
    return this.categories.map((item) => ({ ...item }));
  }

  getHomePayload() {
    const featuredProductIds = new Set<string>();

    const flashSaleProducts = this.flashSales
      .filter((item) => item.status === '进行中' && item.enabled)
      .slice(0, 6)
      .map((activity) => {
        const view = this.toMarketingProductView(activity.productId, activity.price, ['秒杀']);
        if (view) {
          featuredProductIds.add(activity.productId);
        }
        return view;
      })
      .filter(Boolean);

    const groupBuyProducts = this.groupBuys
      .filter((item) => item.status === '进行中' && item.enabled)
      .slice(0, 6)
      .map((activity) => {
        const view = this.toMarketingProductView(activity.productId, activity.price, [
          `${activity.groupSize}人团`
        ]);
        if (view) {
          featuredProductIds.add(activity.productId);
        }
        return view;
      })
      .filter(Boolean);

    const memberProducts = this.products
      .filter(
        (product) =>
          product.listed &&
          (product.categoryId === 'member' ||
            product.tags.some((tag) => tag.includes('会员')))
      )
      .slice(0, 6)
      .map((product) => {
        featuredProductIds.add(product.id);
        return this.toProductView(product);
      });

    const newArrivalProducts = this.products
      .filter((product) => product.listed && !featuredProductIds.has(product.id))
      .slice(0, 6)
      .map((product) => this.toProductView(product));

    return {
      banners: this.banners.map((item) => ({ ...item })),
      categories: this.getCategories(),
      notice: '会员折扣、在线充值、营销活动和后台订单已经全部打通。',
      coupons: this.coupons.filter((item) => item.enabled).map((item) => ({ ...item })),
      sections: [
        ...(flashSaleProducts.length
          ? [
              {
                id: 'hs-live-flash-sales',
                type: 'flash_sale',
                title: '限时秒杀',
                products: flashSaleProducts
              }
            ]
          : []),
        ...(groupBuyProducts.length
          ? [
              {
                id: 'hs-live-group-buy',
                type: 'group_buying',
                title: '拼团专区',
                products: groupBuyProducts
              }
            ]
          : []),
        ...(memberProducts.length
          ? [
              {
                id: 'hs-member-exclusive',
                type: 'member_exclusive',
                title: '会员专享',
                products: memberProducts
              }
            ]
          : []),
        ...(newArrivalProducts.length
          ? [
              {
                id: 'hs-new-arrivals',
                type: 'new_arrivals',
                title: '新品上架',
                products: newArrivalProducts
              }
            ]
          : [])
      ]
    };
  }

  getPublicProducts(categoryId?: string) {
    return this.products
      .filter((item) => item.listed && (!categoryId || item.categoryId === categoryId))
      .map((item) => this.toProductView(item));
  }

  getProductDetail(id: string) {
    const product = this.products.find((item) => item.id === id);
    return product && product.listed
      ? this.toProductView(product)
      : {
          id,
          name: '未找到商品',
          subtitle: '',
          description: '',
          price: 0,
          memberPrice: 0,
          stock: 0,
          sales: 0,
          image: '',
          tags: []
        };
  }

  getAdminProducts() {
    return this.products.map((product) => ({
      ...this.toProductView(product),
      todaySold: this.getTodaySold(product.id),
      categoryName:
        this.categories.find((item) => item.id === product.categoryId)?.name ??
        product.categoryId
    }));
  }

  createProduct(input: CreateProductInput) {
    const timestamp = new Date().toISOString();
    const product: ProductRecord = {
      id: `p-${String(this.products.length + 1).padStart(3, '0')}`,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description?.trim() || '',
      subtitle: input.subtitle?.trim() || '后台新增商品',
      price: roundMoney(input.price),
      memberPrice: roundMoney(input.memberPrice),
      stock: input.stock,
      sales: 0,
      image: input.image?.trim() || this.banners[0]?.image || '',
      tags: input.tags?.length ? uniqueTags(input.tags) : ['新品'],
      listed: input.listed ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.products.unshift(product);
    this.persistState();
    return {
      ...this.toProductView(product),
      todaySold: 0,
      categoryName:
        this.categories.find((item) => item.id === product.categoryId)?.name ??
        product.categoryId
    };
  }

  updateProduct(productId: string, input: UpdateProductInput) {
    const product = this.products.find((item) => item.id === productId);
    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (input.categoryId?.trim()) {
      product.categoryId = input.categoryId.trim();
    }
    if (input.name?.trim()) {
      product.name = input.name.trim();
    }
    if (input.subtitle !== undefined) {
      product.subtitle = input.subtitle.trim();
    }
    if (input.description !== undefined) {
      product.description = input.description.trim();
    }
    if (input.image !== undefined) {
      product.image = input.image.trim() || product.image;
    }
    if (input.price !== undefined) {
      product.price = roundMoney(input.price);
    }
    if (input.memberPrice !== undefined) {
      product.memberPrice = roundMoney(input.memberPrice);
    }
    if (input.stock !== undefined) {
      if (input.stock < 0) {
        throw new BadRequestException('库存不能小于 0');
      }
      product.stock = Math.floor(input.stock);
    }
    if (input.tags !== undefined) {
      product.tags = input.tags.length ? uniqueTags(input.tags) : [];
    }
    if (input.listed !== undefined) {
      product.listed = input.listed;
    }

    product.updatedAt = new Date().toISOString();
    this.persistState();

    return {
      ...this.toProductView(product),
      todaySold: this.getTodaySold(product.id),
      categoryName:
        this.categories.find((item) => item.id === product.categoryId)?.name ??
        product.categoryId
    };
  }

  adjustProductStock(productId: string, delta: number) {
    const product = this.products.find((item) => item.id === productId);
    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const nextStock = product.stock + delta;
    if (nextStock < 0) {
      throw new BadRequestException('库存不能小于 0');
    }

    product.stock = nextStock;
    product.updatedAt = new Date().toISOString();
    this.persistState();
    return {
      ...this.toProductView(product),
      todaySold: this.getTodaySold(product.id),
      categoryName:
        this.categories.find((item) => item.id === product.categoryId)?.name ??
        product.categoryId
    };
  }

  createOrder(input: CreateOrderInput) {
    if (!input.items.length) {
      throw new BadRequestException('下单商品不能为空');
    }

    const items = input.items.map(({ productId, quantity }) => {
      const product = this.products.find((item) => item.id === productId);
      if (!product) {
        throw new NotFoundException(`商品 ${productId} 不存在`);
      }
      if (quantity <= 0) {
        throw new BadRequestException('购买数量必须大于 0');
      }
      if (!product.listed) {
        throw new BadRequestException(`${product.name} 已下架，暂时不能购买`);
      }

      return {
        product,
        quantity
      };
    });

    const member = this.ensureMemberProfile({
      authUserId: input.memberId ?? null,
      nickname: input.customerName,
      mobile: input.customerMobile,
      memberLevel: input.memberLevel ?? '普通会员'
    });

    const totalAmount = roundMoney(
      items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    );
    const payableAmount = roundMoney(
      items.reduce((sum, item) => sum + item.product.memberPrice * item.quantity, 0)
    );
    const paymentMethod = input.paymentMethod ?? 'balance';
    const createdAt = new Date().toISOString();

    if (paymentMethod === 'balance' && member.balance < payableAmount) {
      throw new BadRequestException('账户余额不足');
    }

    const order: OrderRecord = {
      id: `o-${String(this.orders.length + 1).padStart(3, '0')}`,
      orderNo: `SM${Date.now()}`,
      status: '\u5f85\u4ed8\u6b3e',
      paymentMethod,
      paymentState: 'pending',
      paymentChannel: paymentMethod === 'balance' ? 'balance' : null,
      transactionId: null,
      paidAt: null,
      fulfillmentMode: input.fulfillmentMode,
      totalAmount,
      payableAmount,
      customerName: input.customerName,
      customerMobile: input.customerMobile,
      address: input.address,
      memberId: member.id,
      createdAt,
      cancelledAt: null,
      logisticsCompany: null,
      trackingNo: null,
      shippedAt: null,
      completedAt: null,
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        memberPrice: item.product.memberPrice
      }))
    };

    this.orders.unshift(order);

    if (paymentMethod === 'balance') {
      this.markOrderPaid(order.orderNo, {
        paymentChannel: 'balance',
        paidAt: createdAt
      });
    }

    this.persistState();
    return this.toAdminOrder(order);
  }

  getOrderByOrderNo(orderNo: string) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    return order ? this.toAdminOrder(order) : null;
  }

  getRechargeByRechargeNo(rechargeNo: string) {
    const recharge = this.rechargeRecords.find((item) => item.rechargeNo === rechargeNo);
    return recharge ? this.toRechargeView(recharge) : null;
  }

  canAccessOrder(orderNo: string, authUserId?: string | null, mobile?: string | null) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) {
      return false;
    }

    const member = this.findMember(authUserId ?? null, mobile ?? null);
    if (!member) {
      return false;
    }

    return order.memberId === member.id || order.customerMobile === member.mobile;
  }

  canAccessRecharge(rechargeNo: string, authUserId?: string | null, mobile?: string | null) {
    const recharge = this.rechargeRecords.find((item) => item.rechargeNo === rechargeNo);
    if (!recharge) {
      return false;
    }

    const member = this.findMember(authUserId ?? null, mobile ?? null);
    if (!member) {
      return false;
    }

    return recharge.memberId === member.id;
  }

  setOrderPaymentChannel(orderNo: string, paymentChannel: PaymentChannel) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    order.paymentChannel = paymentChannel;
    this.persistState();
    return this.toAdminOrder(order);
  }

  cancelOrder(orderNo: string) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (!this.canCancelOrder(order)) {
      throw new BadRequestException('当前订单已超过可撤销时间');
    }

    if (order.paymentMethod === 'wechat' && order.paymentState === 'success') {
      throw new BadRequestException('微信已支付订单暂不支持直接撤销');
    }

    if (order.paymentState === 'success') {
      const member =
        this.members.find((item) => item.id === order.memberId) ??
        this.ensureMemberProfile({
          authUserId: null,
          nickname: order.customerName,
          mobile: order.customerMobile,
        memberLevel: '普通会员'
        });

      for (const item of order.items) {
        const product = this.products.find((entry) => entry.id === item.productId);
        if (!product) {
          throw new NotFoundException(`商品 ${item.productId} 不存在`);
        }

        product.stock += item.quantity;
        product.sales = Math.max(0, product.sales - item.quantity);

        const flashSale = this.flashSales.find((activity) => activity.productId === product.id);
        if (flashSale) {
          flashSale.stock += item.quantity;
          flashSale.sold = Math.max(0, flashSale.sold - item.quantity);
          if (flashSale.stock > 0 && flashSale.enabled) {
            flashSale.status = '进行中';
          }
        }

        const groupBuy = this.groupBuys.find((activity) => activity.productId === product.id);
        if (groupBuy) {
          groupBuy.completed = Math.max(
            0,
            groupBuy.completed - Math.max(1, Math.ceil(item.quantity / groupBuy.groupSize))
          );
        }
      }

      if (order.paymentMethod === 'balance') {
        member.balance = roundMoney(member.balance + order.payableAmount);
      }

      member.totalOrders = Math.max(0, member.totalOrders - 1);
      member.totalSpent = roundMoney(Math.max(0, member.totalSpent - order.payableAmount));
      member.points = Math.max(0, member.points - Math.floor(order.payableAmount / 10));
      member.growthValue = Math.max(0, member.growthValue - Math.floor(order.payableAmount));
      member.lastOrderAt = this.getLatestPaidOrderTimeForMember(member.id, order.orderNo);

      this.transactions.unshift({
        id: `tx-${Date.now()}-refund`,
        type: '\u9000\u6b3e',
        orderNo: order.orderNo,
        amount: order.payableAmount,
        method:
          order.paymentMethod === 'balance'
            ? '\u4f59\u989d\u9000\u56de'
            : '\u5fae\u4fe1\u9000\u6b3e',
        createdAt: new Date().toISOString(),
        memberId: member.id,
        detail: `${member.nickname} \u64a4\u56de\u8ba2\u5355 ${order.orderNo}`
      });
    }

    order.paymentState = 'closed';
    order.status = '\u5df2\u53d6\u6d88';
    order.cancelledAt = new Date().toISOString();
    this.persistState();

    return this.toAdminOrder(order);
  }

  markOrderPaid(
    orderNo: string,
    input: {
      transactionId?: string | null;
      paymentChannel?: PaymentChannel | null;
      paidAt?: string | null;
    }
  ) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentState === 'closed') {
      return this.toAdminOrder(order);
    }

    if (order.paymentState === 'success') {
      return this.toAdminOrder(order);
    }

    const member =
      this.members.find((item) => item.id === order.memberId) ??
      this.ensureMemberProfile({
        authUserId: null,
        nickname: order.customerName,
        mobile: order.customerMobile,
        memberLevel: '普通会员'
      });

    const productItems = order.items.map((item) => {
      const product = this.products.find((entry) => entry.id === item.productId);
      if (!product) {
        throw new NotFoundException(`商品 ${item.productId} 不存在`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`${product.name} 库存不足`);
      }
      return { item, product };
    });

    if (order.paymentMethod === 'balance' && member.balance < order.payableAmount) {
      throw new BadRequestException('账户余额不足');
    }

    for (const { item, product } of productItems) {
      product.stock -= item.quantity;
      product.sales += item.quantity;

      const flashSale = this.flashSales.find(
        (activity) => activity.productId === product.id && activity.status === '进行中'
      );
      if (flashSale) {
        flashSale.stock = Math.max(0, flashSale.stock - item.quantity);
        flashSale.sold += item.quantity;
        if (flashSale.stock === 0) {
          flashSale.status = '已售罄';
        }
      }

      const groupBuy = this.groupBuys.find(
        (activity) => activity.productId === product.id && activity.status === '进行中'
      );
      if (groupBuy) {
        groupBuy.completed += Math.max(1, Math.ceil(item.quantity / groupBuy.groupSize));
      }
    }

    if (order.paymentMethod === 'balance') {
      member.balance = roundMoney(member.balance - order.payableAmount);
    }

    member.totalOrders += 1;
    member.totalSpent = roundMoney(member.totalSpent + order.payableAmount);
    member.points += Math.floor(order.payableAmount / 10);
    member.growthValue += Math.floor(order.payableAmount);
    member.lastOrderAt = input.paidAt ?? new Date().toISOString();

    if (order.fulfillmentMode === 'delivery') {
      member.defaultConsignee = order.customerName;
      member.contactMobile = order.customerMobile;
      member.defaultAddress = order.address;
    }

    order.paymentState = 'success';
    order.paymentChannel = input.paymentChannel ?? order.paymentChannel ?? 'native';
    order.transactionId = input.transactionId ?? order.transactionId ?? null;
    order.paidAt = input.paidAt ?? new Date().toISOString();
    order.status =
      order.fulfillmentMode === 'pickup' ? '\u5f85\u63d0\u8d27' : '\u5f85\u53d1\u8d27';

    if (
      !this.transactions.some(
        (entry) => entry.orderNo === order.orderNo && entry.type === '\u6536\u6b3e'
      )
    ) {
      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: '\u6536\u6b3e',
        orderNo: order.orderNo,
        amount: order.payableAmount,
        method:
          order.paymentMethod === 'balance'
            ? '\u4f59\u989d\u652f\u4ed8'
            : '\u5fae\u4fe1\u652f\u4ed8',
        createdAt: order.paidAt,
        memberId: member.id,
        detail: `${member.nickname} \u5b8c\u6210\u8ba2\u5355\u652f\u4ed8`
      });
    }

    this.persistState();
    return this.toAdminOrder(order);
  }

  getOrdersForMember(authUserId?: string | null, mobile?: string | null) {
    const member = this.findMember(authUserId ?? null, mobile ?? null);
    if (!member) {
      return [];
    }

    return this.orders
      .filter(
        (order) => order.memberId === member.id || order.customerMobile === member.mobile
      )
      .map((order) => this.toAdminOrder(order));
  }

  getAdminOrders() {
    return this.orders.map((order) => this.toAdminOrder(order));
  }

  getAdminMembers() {
    return this.members.map((member) => this.toAdminMember(member));
  }

  updateMember(
    memberId: string,
    input: {
      memberLevel?: string;
      balanceDelta?: number;
      pointsDelta?: number;
      growthDelta?: number;
      couponsDelta?: number;
    }
  ) {
    const member = this.members.find((item) => item.id === memberId);
    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    if (input.memberLevel?.trim()) {
      member.memberLevel = input.memberLevel.trim();
    }

    if (input.balanceDelta) {
      const nextBalance = roundMoney(member.balance + input.balanceDelta);
      if (nextBalance < 0) {
        throw new BadRequestException('会员余额不能小于 0');
      }
      member.balance = nextBalance;
      this.transactions.unshift({
        id: `tx-${Date.now()}-adjust`,
        type: '调账',
        orderNo: '--',
        amount: roundMoney(input.balanceDelta),
        method: '后台调账',
        createdAt: new Date().toISOString(),
        memberId: member.id,
        detail: `${member.nickname} 余额调整 ${input.balanceDelta > 0 ? '+' : ''}${input.balanceDelta}`
      });
    }

    if (input.pointsDelta) {
      const nextPoints = member.points + input.pointsDelta;
      if (nextPoints < 0) {
        throw new BadRequestException('会员积分不能小于 0');
      }
      member.points = nextPoints;
    }

    if (input.growthDelta) {
      const nextGrowth = member.growthValue + input.growthDelta;
      if (nextGrowth < 0) {
        throw new BadRequestException('成长值不能小于 0');
      }
      member.growthValue = nextGrowth;
    }

    if (input.couponsDelta) {
      const nextCoupons = member.coupons + input.couponsDelta;
      if (nextCoupons < 0) {
        throw new BadRequestException('优惠券数量不能小于 0');
      }
      member.coupons = nextCoupons;
    }

    this.persistState();
    return this.toAdminMember(member);
  }

  getMemberAuthUserId(memberId: string) {
    return this.members.find((item) => item.id === memberId)?.authUserId ?? null;
  }

  getMemberProfile(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
  }) {
    const member =
      this.findMember(input.authUserId ?? null, input.mobile ?? null) ??
      this.ensureMemberProfile({
        authUserId: input.authUserId ?? null,
        mobile: input.mobile ?? '',
        nickname: input.nickname ?? '商城会员',
        memberLevel: input.memberLevel ?? '普通会员',
      });

    return this.toMemberProfile(member);
  }

  updateMemberProfile(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
    defaultConsignee?: string;
    contactMobile?: string;
    defaultAddress?: string;
  }) {
    const member =
      this.findMember(input.authUserId ?? null, input.mobile ?? null) ??
      this.ensureMemberProfile({
        authUserId: input.authUserId ?? null,
        mobile: input.mobile ?? '',
        nickname: input.nickname ?? '商城会员',
        memberLevel: input.memberLevel ?? '普通会员'
      });

    const defaultConsignee = input.defaultConsignee?.trim();
    const contactMobile = input.contactMobile?.trim();
    const defaultAddress = input.defaultAddress?.trim();

    if (!defaultConsignee) {
      throw new BadRequestException('收货人不能为空');
    }
    if (!contactMobile || !/^1[3-9]\d{9}$/.test(contactMobile)) {
      throw new BadRequestException('联系电话格式不正确');
    }
    if (!defaultAddress) {
      throw new BadRequestException('收货地址不能为空');
    }

    member.defaultConsignee = defaultConsignee;
    member.contactMobile = contactMobile;
    member.defaultAddress = defaultAddress;

    this.persistState();
    return this.toMemberProfile(member);
  }

  claimDailyCheckIn(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
  }) {
    const member =
      this.findMember(input.authUserId ?? null, input.mobile ?? null) ??
      this.ensureMemberProfile({
        authUserId: input.authUserId ?? null,
        mobile: input.mobile ?? '',
        nickname: input.nickname ?? '商城会员',
        memberLevel: input.memberLevel ?? '普通会员'
      });

    if (member.lastCheckInAt && isToday(member.lastCheckInAt)) {
      throw new BadRequestException('今天已经签到过了，明天再来');
    }

    const nextStreak = member.lastCheckInAt && isYesterday(member.lastCheckInAt)
      ? member.checkinStreak + 1
      : 1;

    const sortedRules = [...this.checkinRules].sort((left, right) => left.day - right.day);
    const matchedRule =
      sortedRules.find((item) => item.day === nextStreak) ??
      sortedRules.find((item) => item.day === 1) ??
      sortedRules[0];

    const rewardText = matchedRule?.reward ?? '5 积分';
    const rewardPoints = Number((rewardText.match(/(\d+)\s*积分/u)?.[1] ?? '5'));
    const rewardCoupons = rewardText.includes('优惠券') ? 1 : 0;

    member.points += rewardPoints;
    member.coupons += rewardCoupons;
    member.lastCheckInAt = new Date().toISOString();
    member.checkinStreak = nextStreak;

    this.transactions.unshift({
      id: `tx-${Date.now()}-checkin`,
      type: '签到奖励',
      orderNo: `CHECKIN-${Date.now()}`,
      amount: rewardPoints,
      method: '积分入账',
      createdAt: member.lastCheckInAt,
      memberId: member.id,
      detail: `${member.nickname} 连续签到 ${nextStreak} 天，奖励 ${rewardText}`
    });

    this.persistState();
    return {
      rewardPoints,
      rewardCoupons,
      rewardLabel: rewardText,
      streak: nextStreak,
      profile: this.toMemberProfile(member)
    };
  }

  createRechargeRequest(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
    amount: number;
    paymentMethod?: PaymentMethod;
    paymentChannel?: PaymentChannel | null;
  }) {
    if (input.amount <= 0) {
      throw new BadRequestException('\u5145\u503c\u91d1\u989d\u5fc5\u987b\u5927\u4e8e 0');
    }

    const member = this.ensureMemberProfile({
      authUserId: input.authUserId ?? null,
      mobile: input.mobile ?? '',
      nickname: input.nickname ?? '\u5546\u57ce\u4f1a\u5458',
      memberLevel: input.memberLevel ?? '\u666e\u901a\u4f1a\u5458'
    });

    const amount = roundMoney(input.amount);
    const bonusAmount = getRechargeBonus(amount);
    const actualAmount = roundMoney(amount + bonusAmount);
    const paymentMethod = input.paymentMethod ?? 'wechat';
    const createdAt = new Date().toISOString();

    const recharge: RechargeRecord = {
      id: `rc-${Date.now()}`,
      rechargeNo: `RC${Date.now()}`,
      memberId: member.id,
      amount,
      bonusAmount,
      actualAmount,
      method: paymentMethod === 'balance' ? '\u4f59\u989d\u5145\u503c' : '\u5fae\u4fe1\u652f\u4ed8',
      paymentMethod,
      paymentState: 'pending',
      paymentChannel: input.paymentChannel ?? null,
      transactionId: null,
      paidAt: null,
      createdAt
    };

    this.rechargeRecords.unshift(recharge);
    this.persistState();

    return this.toRechargeView(recharge);
  }

  markRechargePaid(
    rechargeNo: string,
    input: {
      transactionId?: string | null;
      paymentChannel?: PaymentChannel | null;
      paidAt?: string | null;
    }
  ) {
    const recharge = this.rechargeRecords.find((item) => item.rechargeNo === rechargeNo);
    if (!recharge) {
      throw new NotFoundException('\u5145\u503c\u8bb0\u5f55\u4e0d\u5b58\u5728');
    }

    if (recharge.paymentState === 'success') {
      return this.toRechargeView(recharge);
    }

    const member =
      this.members.find((item) => item.id === recharge.memberId) ??
      this.ensureMemberProfile({
        authUserId: null,
        mobile: '',
        nickname: '\u5546\u57ce\u4f1a\u5458',
        memberLevel: '\u666e\u901a\u4f1a\u5458'
      });

    member.balance = roundMoney(member.balance + recharge.actualAmount);

    recharge.paymentState = 'success';
    recharge.paymentChannel = input.paymentChannel ?? recharge.paymentChannel ?? 'h5';
    recharge.transactionId = input.transactionId ?? recharge.transactionId ?? null;
    recharge.paidAt = input.paidAt ?? new Date().toISOString();
    recharge.method =
      recharge.paymentMethod === 'balance' ? '\u4f59\u989d\u5145\u503c' : '\u5fae\u4fe1\u652f\u4ed8';

    this.transactions.unshift({
      id: `tx-${Date.now()}-recharge`,
      type: '\u5145\u503c',
      orderNo: recharge.rechargeNo,
      amount: recharge.actualAmount,
      method: recharge.method,
      createdAt: recharge.paidAt,
      memberId: member.id,
      detail: `${member.nickname} \u5145\u503c ${recharge.amount} \u5143\uff0c\u5230\u8d26 ${recharge.actualAmount} \u5143`
    });

    this.persistState();
    return this.toRechargeView(recharge);
  }

  rechargeMember(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
    amount: number;
  }) {
    const recharge = this.createRechargeRequest({
      ...input,
      paymentMethod: 'wechat',
      paymentChannel: 'h5'
    });

    return this.markRechargePaid(recharge.rechargeNo, {
      paymentChannel: 'h5',
      paidAt: recharge.createdAt
    });
  }

  getDashboardSummary() {
    const todayOrders = this.orders.filter(
      (order) => isToday(order.createdAt) && order.paymentState === 'success'
    );
    const monthlyOrders = this.orders.filter(
      (order) => isCurrentMonth(order.createdAt) && order.paymentState === 'success'
    );
    const activeMembers = this.members.filter((member) => member.totalOrders > 0);
    const repeatMembers = activeMembers.filter((member) => member.totalOrders > 1);
    const repurchaseRate = activeMembers.length
      ? Number(((repeatMembers.length / activeMembers.length) * 100).toFixed(1))
      : 0;

    return {
      todaySales: roundMoney(
        todayOrders.reduce((sum, order) => sum + order.payableAmount, 0)
      ),
      monthlySales: roundMoney(
        monthlyOrders.reduce((sum, order) => sum + order.payableAmount, 0)
      ),
      orders: this.orders.length,
      members: this.members.length,
      repurchaseRate,
      rechargeAmount: roundMoney(
        this.rechargeRecords
          .filter((item) => item.paymentState === 'success')
          .reduce((sum, item) => sum + item.actualAmount, 0)
      )
    };
  }

  getFinanceSummary(range: FinanceRange = 'today') {
    const list = this.transactions.filter((item) => isWithinRange(item.createdAt, range));
    const sales = roundMoney(
      list
        .filter((item) => item.type === '收款')
        .reduce((sum, item) => sum + Math.max(item.amount, 0), 0)
    );
    const refunds = roundMoney(
      list
        .filter((item) => item.type === '退款')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0)
    );
    const totalRecharge = roundMoney(
      list
        .filter((item) => item.type === '充值')
        .reduce((sum, item) => sum + Math.max(item.amount, 0), 0)
    );

    return {
      range,
      sales,
      orders: list.filter((item) => item.type === '收款').length,
      refunds,
      profit: roundMoney(sales * 0.32),
      totalRecharge
    };
  }

  getFinanceTransactions(range?: FinanceRange) {
    const list = range
      ? this.transactions.filter((item) => isWithinRange(item.createdAt, range))
      : this.transactions;

    return list.map((item) => ({
      ...item,
      time: formatDateTime(item.createdAt)
    }));
  }

  getPlatformFees() {
    const wechatBase = this.transactions
      .filter((item) => item.method === '微信支付')
      .reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
    const balanceBase = this.transactions
      .filter((item) => item.method === '余额支付')
      .reduce((sum, item) => sum + Math.max(item.amount, 0), 0);

    return {
      wechatFee: roundMoney(wechatBase * 0.006),
      balanceFee: roundMoney(balanceBase * 0.001),
      totalRecharge: roundMoney(
        this.transactions
          .filter((item) => item.type === '充值')
          .reduce((sum, item) => sum + Math.max(item.amount, 0), 0)
      )
    };
  }

  getNotifications() {
    const orderNotifications: NotificationRecord[] = this.orders.slice(0, 5).map((order) => ({
      id: `notice-order-${order.id}`,
      title: '新订单通知',
      content: `订单 ${order.orderNo} 已创建，金额 ¥${order.payableAmount.toFixed(2)}，收货人 ${order.customerName}`,
      type: 'order',
      read: false,
      createdAt: order.createdAt
    }));

    const rechargeNotifications: NotificationRecord[] = this.rechargeRecords
      .filter((record) => record.paymentState === 'success')
      .slice(0, 4)
      .map((record) => {
        const member = this.members.find((item) => item.id === record.memberId);
        return {
          id: `notice-recharge-${record.id}`,
          title: '会员充值到账',
          content: `${member?.nickname ?? '会员'} 充值 ¥${record.amount.toFixed(2)}，到账 ¥${record.actualAmount.toFixed(2)}`,
          type: 'recharge',
          read: false,
          createdAt: record.createdAt
        };
      });

    const stockAlerts: NotificationRecord[] = this.products
      .filter((product) => product.stock > 0 && product.stock < 20)
      .slice(0, 4)
      .map((product) => ({
        id: `notice-stock-${product.id}`,
        title: '库存预警',
        content: `《${product.name}》库存仅剩 ${product.stock} 件，请及时补货。`,
        type: 'alert',
        read: false,
        createdAt: new Date().toISOString()
      }));

    return [...orderNotifications, ...rechargeNotifications, ...stockAlerts, ...this.systemNotifications]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
      .map((item) => ({
        ...item,
        time: formatDateTime(item.createdAt)
      }));
  }

  getCoupons() {
    return this.coupons.map((item) => ({ ...item }));
  }

  createCoupon(input: { title: string; threshold: number; discount: number; total: number }) {
    if (!input.title.trim()) {
      throw new BadRequestException('优惠券名称不能为空');
    }

    const coupon: CouponRecord = {
      id: `c-${String(this.coupons.length + 1).padStart(3, '0')}`,
      title: input.title.trim(),
      threshold: roundMoney(input.threshold),
      discount: roundMoney(input.discount),
      used: 0,
      total: Math.max(1, Math.floor(input.total)),
      status: '进行中',
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.coupons.unshift(coupon);
    this.persistState();
    return { ...coupon };
  }

  updateCoupon(
    couponId: string,
    input: { enabled?: boolean; title?: string; threshold?: number; discount?: number; total?: number }
  ) {
    const coupon = this.coupons.find((item) => item.id === couponId);
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (input.title?.trim()) {
      coupon.title = input.title.trim();
    }
    if (input.threshold !== undefined) {
      coupon.threshold = roundMoney(input.threshold);
    }
    if (input.discount !== undefined) {
      coupon.discount = roundMoney(input.discount);
    }
    if (input.total !== undefined) {
      coupon.total = Math.max(coupon.used, Math.floor(input.total));
    }
    if (input.enabled !== undefined) {
      coupon.enabled = input.enabled;
    }

    coupon.status = coupon.enabled ? '进行中' : '已暂停';
    this.persistState();
    return { ...coupon };
  }

  getFlashSales() {
    return this.flashSales.map((item) => ({
      ...item,
      productName:
        this.products.find((product) => product.id === item.productId)?.name ?? item.productId
    }));
  }

  createFlashSale(input: {
    title: string;
    productId: string;
    price: number;
    stock: number;
  }) {
    const product = this.products.find((item) => item.id === input.productId);
    if (!product) {
      throw new NotFoundException('秒杀商品不存在');
    }

    const flashSale: FlashSaleRecord = {
      id: `fs-${String(this.flashSales.length + 1).padStart(3, '0')}`,
      title: input.title.trim() || `${product.name} 秒杀`,
      productId: product.id,
      price: roundMoney(input.price),
      stock: Math.max(1, Math.floor(input.stock)),
      sold: 0,
      status: '进行中',
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.flashSales.unshift(flashSale);
    this.persistState();
    return {
      ...flashSale,
      productName: product.name
    };
  }

  updateFlashSale(
    flashSaleId: string,
    input: { enabled?: boolean; title?: string; price?: number; stock?: number }
  ) {
    const flashSale = this.flashSales.find((item) => item.id === flashSaleId);
    if (!flashSale) {
      throw new NotFoundException('秒杀活动不存在');
    }

    if (input.title?.trim()) {
      flashSale.title = input.title.trim();
    }
    if (input.price !== undefined) {
      flashSale.price = roundMoney(input.price);
    }
    if (input.stock !== undefined) {
      flashSale.stock = Math.max(0, Math.floor(input.stock));
    }
    if (input.enabled !== undefined) {
      flashSale.enabled = input.enabled;
    }

    flashSale.status = !flashSale.enabled
      ? '已暂停'
      : flashSale.stock > 0
        ? '进行中'
        : '已售罄';

    this.persistState();
    return {
      ...flashSale,
      productName:
        this.products.find((product) => product.id === flashSale.productId)?.name ??
        flashSale.productId
    };
  }

  getGroupBuys() {
    return this.groupBuys.map((item) => ({
      ...item,
      productName:
        this.products.find((product) => product.id === item.productId)?.name ?? item.productId
    }));
  }

  createGroupBuy(input: {
    title: string;
    productId: string;
    price: number;
    groupSize: number;
  }) {
    const product = this.products.find((item) => item.id === input.productId);
    if (!product) {
      throw new NotFoundException('拼团商品不存在');
    }

    const groupBuy: GroupBuyRecord = {
      id: `gb-${String(this.groupBuys.length + 1).padStart(3, '0')}`,
      title: input.title.trim() || `${product.name} 拼团`,
      productId: product.id,
      price: roundMoney(input.price),
      groupSize: Math.max(2, Math.floor(input.groupSize)),
      completed: 0,
      status: '进行中',
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.groupBuys.unshift(groupBuy);
    this.persistState();
    return {
      ...groupBuy,
      productName: product.name
    };
  }

  updateGroupBuy(
    groupBuyId: string,
    input: { enabled?: boolean; title?: string; price?: number; groupSize?: number }
  ) {
    const groupBuy = this.groupBuys.find((item) => item.id === groupBuyId);
    if (!groupBuy) {
      throw new NotFoundException('拼团活动不存在');
    }

    if (input.title?.trim()) {
      groupBuy.title = input.title.trim();
    }
    if (input.price !== undefined) {
      groupBuy.price = roundMoney(input.price);
    }
    if (input.groupSize !== undefined) {
      groupBuy.groupSize = Math.max(2, Math.floor(input.groupSize));
    }
    if (input.enabled !== undefined) {
      groupBuy.enabled = input.enabled;
    }

    groupBuy.status = groupBuy.enabled ? '进行中' : '已暂停';
    this.persistState();
    return {
      ...groupBuy,
      productName:
        this.products.find((product) => product.id === groupBuy.productId)?.name ??
        groupBuy.productId
    };
  }

  updateOrderStatus(
    orderNo: string,
    input: {
      action: 'ship' | 'complete' | 'cancel';
      logisticsCompany?: string;
      trackingNo?: string;
    }
  ) {
    if (input.action === 'cancel') {
      return this.cancelOrder(orderNo);
    }

    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentState !== 'success') {
      throw new BadRequestException('订单未支付，暂时不能执行该操作');
    }

    if (order.status === '已取消') {
      throw new BadRequestException('已取消订单不能继续处理');
    }

    if (input.action === 'ship') {
      if (order.fulfillmentMode !== 'delivery') {
        throw new BadRequestException('仅配送订单支持发货');
      }
      if (order.status !== '待发货') {
        throw new BadRequestException('当前订单状态不能发货');
      }

      const logisticsCompany = input.logisticsCompany?.trim();
      const trackingNo = input.trackingNo?.trim();

      if (!logisticsCompany || !trackingNo) {
        throw new BadRequestException('发货时必须填写物流公司和运单号');
      }

      order.status = '待收货';
      order.logisticsCompany = logisticsCompany;
      order.trackingNo = trackingNo;
      order.shippedAt = new Date().toISOString();
    }

    if (input.action === 'complete') {
      if (!['待收货', '待提货', '待发货'].includes(order.status)) {
        throw new BadRequestException('当前订单状态不能完成');
      }

      if (order.fulfillmentMode === 'delivery' && order.status === '待发货') {
        throw new BadRequestException('配送订单需先发货后再完成');
      }

      order.status = '已完成';
      order.completedAt = new Date().toISOString();
    }

    this.persistState();
    return this.toAdminOrder(order);
  }

  getCheckinRules() {
    return this.checkinRules.map((item) => ({ ...item }));
  }

  updateCheckinRules(rules: CheckinRuleRecord[]) {
    if (!rules.length) {
      throw new BadRequestException('签到规则不能为空');
    }

    this.checkinRules = rules
      .map((item) => ({
        day: Math.max(1, Math.floor(item.day)),
        reward: item.reward.trim(),
        desc: item.desc.trim()
      }))
      .sort((left, right) => left.day - right.day);

    this.persistState();
    return this.getCheckinRules();
  }

  ensureMemberProfile(input: {
    authUserId?: string | null;
    nickname: string;
    mobile: string;
    memberLevel?: string | null;
    initialBalance?: number;
  }) {
    const existing = this.findMember(input.authUserId ?? null, input.mobile);
    if (existing) {
      existing.nickname = input.nickname || existing.nickname;
      existing.authUserId = input.authUserId ?? existing.authUserId;
      if (!existing.memberLevel && input.memberLevel) {
        existing.memberLevel = input.memberLevel;
      }
      if (!existing.defaultConsignee) {
        existing.defaultConsignee = existing.nickname;
      }
      if (!existing.contactMobile) {
        existing.contactMobile = existing.mobile;
      }
      return existing;
    }

    const member: MemberRecord = {
      id: `u-${String(this.members.length + 1).padStart(3, '0')}`,
      authUserId: input.authUserId ?? null,
      nickname: input.nickname,
      mobile: input.mobile,
      memberLevel: input.memberLevel || '普通会员',
      balance: roundMoney(input.initialBalance ?? 0),
      points: 0,
      growthValue: 0,
      coupons: 0,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      defaultConsignee: input.nickname,
      contactMobile: input.mobile,
      defaultAddress: '上海市浦东新区张江路 88 号 星选生活馆',
      lastCheckInAt: null,
      checkinStreak: 0
    };

    this.members.unshift(member);
    this.persistState();
    return member;
  }

  private buildSeedCoupons() {
    return seedCoupons.map((item, index) => ({
      ...item,
      used: [156, 89][index] ?? 0,
      total: [500, 200][index] ?? 300,
      status: '进行中',
      enabled: true,
      createdAt: createIso(index + 2)
    }));
  }

  private buildSeedFlashSales() {
    return [
      {
        id: 'fs-001',
        title: '每日 10 点秒杀',
        productId: 'p-001',
        price: 29.9,
        stock: 50,
        sold: 38,
        status: '进行中',
        enabled: true,
        createdAt: createIso(1)
      },
      {
        id: 'fs-002',
        title: '周末特惠',
        productId: 'p-002',
        price: 19.9,
        stock: 100,
        sold: 72,
        status: '进行中',
        enabled: true,
        createdAt: createIso(0)
      }
    ];
  }

  private buildSeedGroupBuys() {
    return [
      {
        id: 'gb-001',
        title: '3 人拼团蜜桃礼盒',
        productId: 'p-001',
        price: 39.9,
        groupSize: 3,
        completed: 12,
        status: '进行中',
        enabled: true,
        createdAt: createIso(2)
      },
      {
        id: 'gb-002',
        title: '5 人拼团益生菌礼盒',
        productId: 'p-003',
        price: 89,
        groupSize: 5,
        completed: 8,
        status: '进行中',
        enabled: true,
        createdAt: createIso(1)
      }
    ];
  }

  private buildSeedOrders() {
    return seedOrders.map((order, index) => {
      const items = order.productIds.map((productId) => {
        const product = this.products.find((item) => item.id === productId);
        if (!product) {
          throw new Error(`Missing seed product ${productId}`);
        }

        return {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          memberPrice: product.memberPrice
        };
      });

      const paymentMethod: PaymentMethod =
        order.status === 'pending_payment' || order.fulfillmentMode === 'pickup'
          ? 'wechat'
          : 'balance';
      const paymentState: PaymentState = order.status === 'pending_payment' ? 'pending' : 'success';
      const paidAt = paymentState === 'success' ? createIso(index) : null;

      return {
        id: order.id,
        orderNo: order.orderNo,
        status: mapSeedStatus(order.status, order.fulfillmentMode),
        paymentMethod,
        paymentState,
        paymentChannel: paymentState === 'success' ? (paymentMethod === 'wechat' ? 'native' : 'balance') : null,
        transactionId:
          paymentState === 'success' && paymentMethod === 'wechat'
            ? `420000000000000000${index + 1}`
            : null,
        paidAt,
        fulfillmentMode: order.fulfillmentMode === 'pickup' ? 'pickup' : 'delivery',
        totalAmount: order.totalAmount,
        payableAmount: order.payableAmount,
        customerName: '星选会员',
        customerMobile: '13800138000',
        address:
          order.fulfillmentMode === 'pickup'
            ? '上海市浦东新区张江路 88 号 星选生活馆自提点'
            : '上海市浦东新区张江路 88 号 星选生活馆 601 室',
        memberId: 'u-001',
        createdAt: createIso(index),
        cancelledAt: null,
        logisticsCompany: null,
        trackingNo: null,
        shippedAt: null,
        completedAt: paymentState === 'success' && order.fulfillmentMode !== 'pickup' ? createIso(index) : null,
        items
      } satisfies OrderRecord;
    });
  }

  private buildSeedMembers() {
    return seedMembers.map((member, index) => {
      const mobile = index === 0 ? '13800138000' : member.mobile;
      const memberOrders = this.orders.filter((order) => order.customerMobile === mobile);

      return {
        ...member,
        authUserId: null,
        nickname: index === 0 ? '星选会员' : member.nickname,
        mobile,
        memberLevel: index === 0 ? '黄金会员' : member.memberLevel,
        balance: index === 0 ? 520 : member.balance,
        totalOrders: memberOrders.length,
        totalSpent: roundMoney(
          memberOrders.reduce((sum, order) => sum + order.payableAmount, 0)
        ),
        lastOrderAt: memberOrders[0]?.createdAt ?? null,
        defaultConsignee: member.nickname,
        contactMobile: mobile,
        defaultAddress: '上海市浦东新区张江路 88 号 星选生活馆',
        lastCheckInAt: null,
        checkinStreak: 0
      } satisfies MemberRecord;
    });
  }

  private buildSeedTransactions() {
    return this.orders.map((order, index) => ({
      id: `tx-seed-${index + 1}`,
      type: '收款',
      orderNo: order.orderNo,
      amount: order.payableAmount,
      method: order.fulfillmentMode === 'pickup' ? '微信支付' : '余额支付',
      createdAt: order.createdAt,
      memberId: order.memberId,
      detail: `${order.customerName} 完成订单支付`
    }));
  }

  private findMember(authUserId?: string | null, mobile?: string | null) {
    if (authUserId) {
      const byAuthUserId = this.members.find((item) => item.authUserId === authUserId);
      if (byAuthUserId) {
        return byAuthUserId;
      }
    }

    if (mobile) {
      return this.members.find((item) => item.mobile === mobile) ?? null;
    }

    return null;
  }

  private getTodaySold(productId: string) {
    return this.orders
      .filter((order) => isToday(order.createdAt) && order.paymentState === 'success')
      .reduce((sum, order) => {
        const item = order.items.find((entry) => entry.productId === productId);
        return sum + (item?.quantity ?? 0);
      }, 0);
  }

  private getLatestPaidOrderTimeForMember(memberId: string, excludeOrderNo?: string) {
    const paidOrders = this.orders
      .filter(
        (order) =>
          order.memberId === memberId &&
          order.paymentState === 'success' &&
          order.orderNo !== excludeOrderNo
      )
      .sort(
        (left, right) =>
          new Date(right.paidAt ?? right.createdAt).getTime() -
          new Date(left.paidAt ?? left.createdAt).getTime()
      );

    return paidOrders[0]?.paidAt ?? paidOrders[0]?.createdAt ?? null;
  }

  private canCancelOrder(order: OrderRecord) {
    if (order.paymentState === 'closed' || order.status === '\u5df2\u53d6\u6d88') {
      return false;
    }

    if (order.paymentMethod === 'wechat' && order.paymentState === 'success') {
      return false;
    }

    const deadline = new Date(order.createdAt).getTime() + ORDER_CANCEL_WINDOW_MS;
    return Date.now() <= deadline;
  }

  private hydrateState() {
    const filePath = this.getRuntimeStateFilePath();
    if (!existsSync(filePath)) {
      return;
    }

    try {
      const raw = readFileSync(filePath, 'utf8');
      if (!raw.trim()) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<RuntimeState>;

      if (parsed.products?.length) {
        this.products = parsed.products.map((item) => ({
          ...item,
          subtitle: item.subtitle ?? '',
          description: item.description ?? '',
          tags: [...(item.tags ?? [])],
          listed: item.listed ?? true,
          createdAt: item.createdAt ?? new Date().toISOString(),
          updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString()
        }));
      }

      if (parsed.coupons) {
        this.coupons = parsed.coupons.map((item) => ({
          ...item,
          enabled: item.enabled ?? item.status !== '已暂停'
        }));
      }

      if (parsed.flashSales) {
        this.flashSales = parsed.flashSales.map((item) => ({
          ...item,
          enabled: item.enabled ?? item.status !== '已暂停'
        }));
      }

      if (parsed.groupBuys) {
        this.groupBuys = parsed.groupBuys.map((item) => ({
          ...item,
          enabled: item.enabled ?? item.status !== '已暂停'
        }));
      }

      if (parsed.checkinRules?.length) {
        this.checkinRules = parsed.checkinRules.map((item) => ({ ...item }));
      }

      if (parsed.orders) {
        this.orders = parsed.orders.map((item) => ({
          ...item,
          logisticsCompany: item.logisticsCompany ?? null,
          trackingNo: item.trackingNo ?? null,
          shippedAt: item.shippedAt ?? null,
          completedAt: item.completedAt ?? null,
          items: item.items.map((orderItem) => ({ ...orderItem }))
        }));
      }

      if (parsed.members) {
        this.members = parsed.members.map((item) => ({ ...item }));
      }

      if (parsed.rechargeRecords) {
        this.rechargeRecords = parsed.rechargeRecords.map((item) => ({ ...item }));
      }

      if (parsed.transactions) {
        this.transactions = parsed.transactions.map((item) => ({ ...item }));
      }

      if (parsed.systemNotifications) {
        this.systemNotifications = parsed.systemNotifications.map((item) => ({ ...item }));
      }
    } catch {
      // Ignore malformed persisted data and keep seeded defaults.
    }
  }

  private persistState() {
    const filePath = this.getRuntimeStateFilePath();
    mkdirSync(dirname(filePath), { recursive: true });

    const state: RuntimeState = {
      products: this.products,
      coupons: this.coupons,
      flashSales: this.flashSales,
      groupBuys: this.groupBuys,
      checkinRules: this.checkinRules,
      orders: this.orders,
      members: this.members,
      rechargeRecords: this.rechargeRecords,
      transactions: this.transactions,
      systemNotifications: this.systemNotifications
    };

    writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private getRuntimeStateFilePath() {
    return resolve(process.env.RUNTIME_DATA_FILE ?? 'apps/api/runtime/runtime-data.json');
  }

  private toProductView(product: ProductRecord) {
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      price: product.price,
      memberPrice: product.memberPrice,
      stock: product.stock,
      sales: product.sales,
      image: product.image,
      tags: [...product.tags],
      listed: product.listed,
      updatedAt: product.updatedAt
    };
  }

  private toMarketingProductView(productId: string, memberPrice: number, extraTags: string[]) {
    const product = this.products.find((item) => item.id === productId);
    if (!product || !product.listed) {
      return null;
    }

    return {
      ...this.toProductView(product),
      memberPrice: roundMoney(memberPrice),
      tags: uniqueTags([...product.tags, ...extraTags])
    };
  }

  private toAdminOrder(order: OrderRecord) {
    const cancelDeadlineAt = addMilliseconds(order.createdAt, ORDER_CANCEL_WINDOW_MS);

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentState: order.paymentState,
      paymentChannel: order.paymentChannel,
      transactionId: order.transactionId,
      paidAt: order.paidAt,
      fulfillmentMode:
        order.fulfillmentMode === 'pickup'
          ? '\u95e8\u5e97\u81ea\u63d0'
          : '\u5feb\u9012\u5230\u5bb6',
      payableAmount: order.payableAmount,
      totalAmount: order.totalAmount,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      address: order.address,
      createdAt: order.createdAt,
      cancelDeadlineAt,
      cancelledAt: order.cancelledAt,
      logisticsCompany: order.logisticsCompany,
      trackingNo: order.trackingNo,
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
      canCancel: this.canCancelOrder(order),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      itemSummary: order.items
        .map((item) => `${item.productName} x${item.quantity}`)
        .join('\uff1b'),
      items: order.items.map((item) => ({ ...item }))
    };
  }

  private toAdminMember(member: MemberRecord) {
    return {
      id: member.id,
      nickname: member.nickname,
      mobile: member.mobile,
      memberLevel: member.memberLevel,
      balance: member.balance,
      points: member.points,
      growthValue: member.growthValue,
      coupons: member.coupons,
      totalOrders: member.totalOrders,
      totalSpent: member.totalSpent,
      lastOrderAt: member.lastOrderAt,
      lastCheckInAt: member.lastCheckInAt,
      checkinStreak: member.checkinStreak
    };
  }

  private toMemberProfile(member: MemberRecord) {
    return {
      ...this.toAdminMember(member),
      defaultConsignee: member.defaultConsignee,
      contactMobile: member.contactMobile,
      defaultAddress: member.defaultAddress
    };
  }

  private toRechargeView(recharge: RechargeRecord) {
    const member = this.members.find((item) => item.id === recharge.memberId);

    return {
      id: recharge.id,
      rechargeNo: recharge.rechargeNo,
      amount: recharge.amount,
      bonusAmount: recharge.bonusAmount,
      actualAmount: recharge.actualAmount,
      balanceAfter: member?.balance ?? 0,
      paymentMethod: recharge.paymentMethod,
      paymentState: recharge.paymentState,
      paymentChannel: recharge.paymentChannel,
      transactionId: recharge.transactionId,
      paidAt: recharge.paidAt,
      createdAt: recharge.createdAt
    };
  }
}
