# 智能会员商城系统

智能会员商城系统是一个面向社区团购和会员超市场景的多端商城骨架项目，包含：

- `apps/mobile`：UniApp 用户端
- `apps/admin`：Vue 3 管理后台
- `apps/api`：NestJS API 服务
- `packages/shared`：共享类型与演示数据

## 目标

本仓库提供一套可继续商业化落地的首版基础工程，用于承载商品销售、会员运营、订单履约和营销活动。

## 当前阶段

当前版本优先完成：

- 商城主链路
- 会员中心与优惠券
- 拼团、秒杀、签到的结构化入口
- 双履约模式
- 文档与云部署骨架

## 本地开发

```bash
npm install
npm run dev:api
npm run dev:admin
npm run dev:mobile
```
