# 部署方案

## 运行组件

- Nginx
- Admin 静态资源
- Mobile H5 预览构建
- API 容器
- MySQL
- Redis

## 推荐云部署

1. 使用 Docker Compose 进行本地联调
2. 生产环境拆分 API、MySQL、Redis
3. 图片上传到 OSS/COS
4. 使用环境变量管理 JWT、数据库、缓存等配置

## 微信支付流程预留

1. 创建待支付订单
2. 调用支付网关服务
3. 接收支付回调
4. 变更订单状态
5. 触发履约流程
