import { BadRequestException, Injectable } from '@nestjs/common';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

interface SupportHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiSupportService {
  constructor(private readonly runtimeDataService: RuntimeDataService) {}

  async reply(input: {
    authUserId?: string | null;
    mobile?: string | null;
    nickname?: string;
    memberLevel?: string | null;
    message: string;
    history: SupportHistoryMessage[];
  }) {
    const message = input.message.trim();
    if (!message) {
      throw new BadRequestException('客服消息不能为空');
    }

    const profile = this.runtimeDataService.getMemberProfile({
      authUserId: input.authUserId ?? null,
      mobile: input.mobile ?? null,
      nickname: input.nickname,
      memberLevel: input.memberLevel ?? null
    });
    const orders = this.runtimeDataService
      .getOrdersForMember(input.authUserId ?? null, input.mobile ?? null)
      .slice(0, 5);

    const providerReply = await this.tryProviderReply({
      profile,
      orders,
      message,
      history: input.history
    }).catch(() => null);

    if (providerReply) {
      return {
        reply: providerReply,
        handoffSuggested: false
      };
    }

    return {
      reply: this.buildFallbackReply({
        profile,
        orders,
        message
      }),
      handoffSuggested: false
    };
  }

  private async tryProviderReply(input: {
    profile: ReturnType<RuntimeDataService['getMemberProfile']>;
    orders: ReturnType<RuntimeDataService['getOrdersForMember']>;
    message: string;
    history: SupportHistoryMessage[];
  }) {
    const apiKey = process.env.AI_CUSTOMER_SERVICE_API_KEY?.trim();
    const model = process.env.AI_CUSTOMER_SERVICE_MODEL?.trim();
    const baseUrl = (
      process.env.AI_CUSTOMER_SERVICE_BASE_URL?.trim() || 'https://api.openai.com/v1'
    ).replace(/\/$/, '');

    if (!apiKey || !model) {
      return null;
    }

    const systemPrompt = [
      '你是智能会员商城系统的 AI 客服。',
      '请基于提供的会员资料和订单信息，使用简洁、专业、友好的中文回答。',
      '不要编造不存在的订单、金额或物流信息。',
      `会员昵称：${input.profile.nickname}`,
      `会员手机号：${input.profile.mobile}`,
      `会员等级：${input.profile.memberLevel}`,
      `账户余额：${input.profile.balance} 元`,
      `积分：${input.profile.points}`,
      `优惠券：${input.profile.coupons} 张`,
      `默认收货地址：${input.profile.defaultAddress || '未填写'}`,
      `最近订单：${input.orders
        .map((order) => `${order.orderNo}(${order.status}, ${order.payableAmount}元)`)
        .join('；') || '暂无'}`
    ].join('\n');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          ...input.history.map((item) => ({
            role: item.role,
            content: item.content
          })),
          { role: 'user', content: input.message }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || null;
  }

  private buildFallbackReply(input: {
    profile: ReturnType<RuntimeDataService['getMemberProfile']>;
    orders: ReturnType<RuntimeDataService['getOrdersForMember']>;
    message: string;
  }) {
    const normalized = input.message.toLowerCase();
    const latestOrder = input.orders[0];

    if (normalized.includes('积分') || normalized.includes('签到')) {
      return `${input.profile.nickname}，您当前手机号 ${input.profile.mobile}，账户积分为 ${input.profile.points}，连续签到 ${input.profile.checkinStreak} 天。`;
    }

    if (normalized.includes('余额') || normalized.includes('充值')) {
      return `${input.profile.nickname}，您当前余额为 ¥${input.profile.balance.toFixed(2)}。充值到账后会自动更新余额，赠送规则按页面展示执行。`;
    }

    if (normalized.includes('优惠券')) {
      return `${input.profile.nickname}，您当前可用优惠券数量为 ${input.profile.coupons} 张。`;
    }

    if (normalized.includes('地址') || normalized.includes('收货')) {
      return `${input.profile.nickname}，您当前默认收货信息为：${input.profile.defaultConsignee}，${input.profile.contactMobile}，${input.profile.defaultAddress || '暂未填写收货地址'}。`;
    }

    if (
      normalized.includes('订单') ||
      normalized.includes('发货') ||
      normalized.includes('物流') ||
      normalized.includes('快递')
    ) {
      if (!latestOrder) {
        return `${input.profile.nickname}，您当前还没有可查询的订单。如需下单，可以先在首页加入商品到购物车后提交。`;
      }

      return `${input.profile.nickname}，您最近一笔订单是 ${latestOrder.orderNo}，当前状态为 ${latestOrder.status}，收货手机为 ${latestOrder.customerMobile}，收货地址为 ${latestOrder.address}。`;
    }

    return `${input.profile.nickname}，我可以帮您查询订单、余额、积分、优惠券、收货地址和充值情况。您当前手机号是 ${input.profile.mobile}，最近可直接问我“查订单”或“查积分”。`;
  }
}
