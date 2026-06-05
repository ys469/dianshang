import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  banners as seedBanners,
  categories as seedCategories,
  coupons as seedCoupons,
  members as seedMembers,
  orders as seedOrders,
  products as seedProducts
} from '../../data/demo-data';

type FinanceRange = 'today' | 'week' | 'month';

interface ProductRecord {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string;
  price: number;
  memberPrice: number;
  stock: number;
  sales: number;
  image: string;
  tags: string[];
  createdAt: string;
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
  fulfillmentMode: 'delivery' | 'pickup';
  totalAmount: number;
  payableAmount: number;
  customerName: string;
  customerMobile: string;
  address: string;
  memberId: string | null;
  createdAt: string;
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
  defaultAddress: string;
}

interface RechargeRecord {
  id: string;
  memberId: string;
  amount: number;
  bonusAmount: number;
  actualAmount: number;
  method: string;
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
  price: number;
  memberPrice: number;
  stock: number;
  tags?: string[];
  image?: string;
}

interface CreateOrderInput {
  fulfillmentMode: 'delivery' | 'pickup';
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  customerMobile: string;
  address: string;
  memberId?: string | null;
  memberLevel?: string | null;
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
export class RuntimeDataService {
  private readonly categories = seedCategories.map((item) => ({ ...item }));
  private readonly banners = seedBanners.map((item) => ({ ...item }));

  private products: ProductRecord[] = seedProducts.map((item) => ({
    ...item,
    subtitle: item.subtitle ?? '',
    tags: [...item.tags],
    createdAt: createIso(15)
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

  getCategories() {
    return this.categories.map((item) => ({ ...item }));
  }

  getHomePayload() {
    const featuredProductIds = new Set<string>();

    const flashSaleProducts = this.flashSales
      .filter((item) => item.status === '进行中')
      .slice(0, 6)
      .map((activity) => {
        featuredProductIds.add(activity.productId);
        return this.toMarketingProductView(activity.productId, activity.price, ['秒杀']);
      })
      .filter(Boolean);

    const groupBuyProducts = this.groupBuys
      .filter((item) => item.status === '进行中')
      .slice(0, 6)
      .map((activity) => {
        featuredProductIds.add(activity.productId);
        return this.toMarketingProductView(activity.productId, activity.price, [`${activity.groupSize}人团`]);
      })
      .filter(Boolean);

    const memberProducts = this.products
      .filter(
        (product) =>
          product.categoryId === 'member' ||
          product.tags.some((tag) => tag.includes('会员'))
      )
      .slice(0, 6)
      .map((product) => {
        featuredProductIds.add(product.id);
        return this.toProductView(product);
      });

    const newArrivalProducts = this.products
      .filter((product) => !featuredProductIds.has(product.id))
      .slice(0, 6)
      .map((product) => this.toProductView(product));

    return {
      banners: this.banners.map((item) => ({ ...item })),
      categories: this.getCategories(),
      notice: '会员折扣、在线充值、营销活动和后台订单已经全部打通。',
      coupons: this.coupons.map((item) => ({ ...item })),
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
      .filter((item) => !categoryId || item.categoryId === categoryId)
      .map((item) => this.toProductView(item));
  }

  getProductDetail(id: string) {
    const product = this.products.find((item) => item.id === id);
    return product
      ? this.toProductView(product)
      : {
          id,
          name: '未找到商品',
          subtitle: '',
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
    const product: ProductRecord = {
      id: `p-${String(this.products.length + 1).padStart(3, '0')}`,
      categoryId: input.categoryId,
      name: input.name,
      subtitle: input.subtitle?.trim() || '后台新增商品',
      price: roundMoney(input.price),
      memberPrice: roundMoney(input.memberPrice),
      stock: input.stock,
      sales: 0,
      image: input.image || this.banners[0]?.image || '',
      tags: input.tags?.length ? uniqueTags(input.tags) : ['新品'],
      createdAt: new Date().toISOString()
    };

    this.products.unshift(product);
    return {
      ...this.toProductView(product),
      todaySold: 0,
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
      throw new BadRequestException('至少选择一件商品');
    }

    const items = input.items.map(({ productId, quantity }) => {
      const product = this.products.find((item) => item.id === productId);
      if (!product) {
        throw new NotFoundException(`商品 ${productId} 不存在`);
      }
      if (quantity <= 0) {
        throw new BadRequestException('商品数量必须大于 0');
      }
      if (product.stock < quantity) {
        throw new BadRequestException(`${product.name} 库存不足`);
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
      memberLevel: input.memberLevel ?? '普通会员',
      initialBalance: 120
    });

    const totalAmount = roundMoney(
      items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    );
    const payableAmount = roundMoney(
      items.reduce((sum, item) => sum + item.product.memberPrice * item.quantity, 0)
    );

    if (member.balance < payableAmount) {
      throw new BadRequestException('余额不足，请先充值');
    }

    for (const item of items) {
      item.product.stock -= item.quantity;
      item.product.sales += item.quantity;

      const flashSale = this.flashSales.find(
        (activity) => activity.productId === item.product.id && activity.status === '进行中'
      );
      if (flashSale) {
        flashSale.stock = Math.max(0, flashSale.stock - item.quantity);
        flashSale.sold += item.quantity;
        if (flashSale.stock === 0) {
          flashSale.status = '已售罄';
        }
      }

      const groupBuy = this.groupBuys.find(
        (activity) => activity.productId === item.product.id && activity.status === '进行中'
      );
      if (groupBuy) {
        groupBuy.completed += Math.max(1, Math.ceil(item.quantity / groupBuy.groupSize));
      }
    }

    member.balance = roundMoney(member.balance - payableAmount);
    member.totalOrders += 1;
    member.totalSpent = roundMoney(member.totalSpent + payableAmount);
    member.points += Math.floor(payableAmount / 10);
    member.growthValue += Math.floor(payableAmount);
    member.lastOrderAt = new Date().toISOString();
    if (input.fulfillmentMode === 'delivery') {
      member.defaultAddress = input.address;
    }

    const order: OrderRecord = {
      id: `o-${String(this.orders.length + 1).padStart(3, '0')}`,
      orderNo: `SM${Date.now()}`,
      status: input.fulfillmentMode === 'pickup' ? '待提货' : '待发货',
      fulfillmentMode: input.fulfillmentMode,
      totalAmount,
      payableAmount,
      customerName: input.customerName,
      customerMobile: input.customerMobile,
      address: input.address,
      memberId: member.id,
      createdAt: new Date().toISOString(),
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        memberPrice: item.product.memberPrice
      }))
    };

    this.orders.unshift(order);
    this.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: '收款',
      orderNo: order.orderNo,
      amount: payableAmount,
      method: '余额支付',
      createdAt: order.createdAt,
      memberId: member.id,
      detail: `${member.nickname} 完成订单支付`
    });

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
        mobile: input.mobile ?? '13800138000',
        nickname: input.nickname ?? '商城会员',
        memberLevel: input.memberLevel ?? '普通会员',
        initialBalance: 120
      });

    return {
      ...this.toAdminMember(member),
      defaultAddress: member.defaultAddress
    };
  }

  rechargeMember(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
    amount: number;
  }) {
    if (input.amount <= 0) {
      throw new BadRequestException('充值金额必须大于 0');
    }

    const member = this.ensureMemberProfile({
      authUserId: input.authUserId ?? null,
      mobile: input.mobile ?? '13800138000',
      nickname: input.nickname ?? '商城会员',
      memberLevel: input.memberLevel ?? '普通会员',
      initialBalance: 120
    });

    const bonusAmount = getRechargeBonus(input.amount);
    const actualAmount = roundMoney(input.amount + bonusAmount);
    member.balance = roundMoney(member.balance + actualAmount);

    const recharge: RechargeRecord = {
      id: `rc-${Date.now()}`,
      memberId: member.id,
      amount: roundMoney(input.amount),
      bonusAmount,
      actualAmount,
      method: '微信支付',
      createdAt: new Date().toISOString()
    };

    this.rechargeRecords.unshift(recharge);
    this.transactions.unshift({
      id: `tx-${Date.now()}-recharge`,
      type: '充值',
      orderNo: '--',
      amount: actualAmount,
      method: '微信支付',
      createdAt: recharge.createdAt,
      memberId: member.id,
      detail: `${member.nickname} 充值 ${input.amount} 元，到账 ${actualAmount} 元`
    });

    return {
      id: recharge.id,
      amount: recharge.amount,
      bonusAmount: recharge.bonusAmount,
      actualAmount: recharge.actualAmount,
      balanceAfter: member.balance,
      createdAt: recharge.createdAt
    };
  }

  getDashboardSummary() {
    const todayOrders = this.orders.filter((order) => isToday(order.createdAt));
    const monthlyOrders = this.orders.filter((order) => isCurrentMonth(order.createdAt));
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
        this.rechargeRecords.reduce((sum, item) => sum + item.actualAmount, 0)
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
      createdAt: new Date().toISOString()
    };

    this.coupons.unshift(coupon);
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
      createdAt: new Date().toISOString()
    };

    this.flashSales.unshift(flashSale);
    return {
      ...flashSale,
      productName: product.name
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
      createdAt: new Date().toISOString()
    };

    this.groupBuys.unshift(groupBuy);
    return {
      ...groupBuy,
      productName: product.name
    };
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
      return existing;
    }

    const member: MemberRecord = {
      id: `u-${String(this.members.length + 1).padStart(3, '0')}`,
      authUserId: input.authUserId ?? null,
      nickname: input.nickname,
      mobile: input.mobile,
      memberLevel: input.memberLevel || '普通会员',
      balance: roundMoney(input.initialBalance ?? 120),
      points: 0,
      growthValue: 0,
      coupons: 0,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      defaultAddress: '上海市浦东新区张江路 88 号 星选生活馆'
    };

    this.members.unshift(member);
    return member;
  }

  private buildSeedCoupons() {
    return seedCoupons.map((item, index) => ({
      ...item,
      used: [156, 89][index] ?? 0,
      total: [500, 200][index] ?? 300,
      status: '进行中',
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

      return {
        id: order.id,
        orderNo: order.orderNo,
        status: mapSeedStatus(order.status, order.fulfillmentMode),
        fulfillmentMode: order.fulfillmentMode === 'pickup' ? 'pickup' : 'delivery',
        totalAmount: order.totalAmount,
        payableAmount: order.payableAmount,
        customerName: '星选会员',
        customerMobile: '13800138000',
        address:
          order.fulfillmentMode === 'pickup'
            ? '浦东新区张江会员店自提点'
            : '上海市浦东新区张江路 88 号 星选生活馆',
        memberId: 'u-001',
        createdAt: createIso(index),
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
        defaultAddress: '上海市浦东新区张江路 88 号 星选生活馆'
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
      .filter((order) => isToday(order.createdAt))
      .reduce((sum, order) => {
        const item = order.items.find((entry) => entry.productId === productId);
        return sum + (item?.quantity ?? 0);
      }, 0);
  }

  private toProductView(product: ProductRecord) {
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price,
      memberPrice: product.memberPrice,
      stock: product.stock,
      sales: product.sales,
      image: product.image,
      tags: [...product.tags]
    };
  }

  private toMarketingProductView(productId: string, memberPrice: number, extraTags: string[]) {
    const product = this.products.find((item) => item.id === productId);
    if (!product) {
      return null;
    }

    return {
      ...this.toProductView(product),
      memberPrice: roundMoney(memberPrice),
      tags: uniqueTags([...product.tags, ...extraTags])
    };
  }

  private toAdminOrder(order: OrderRecord) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      fulfillmentMode: order.fulfillmentMode === 'pickup' ? '门店自提' : '快递到家',
      payableAmount: order.payableAmount,
      totalAmount: order.totalAmount,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      address: order.address,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      itemSummary: order.items
        .map((item) => `${item.productName} x${item.quantity}`)
        .join('；'),
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
      lastOrderAt: member.lastOrderAt
    };
  }
}
