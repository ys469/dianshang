# API 接口文档概要

## 用户端

- `POST /auth/login`
- `GET /home`
- `GET /categories`
- `GET /products`
- `GET /products/:id`
- `GET /cart`
- `POST /cart/items`
- `GET /members/profile`
- `GET /coupons`
- `GET /marketing/sections`
- `POST /orders`
- `GET /orders`

## 后台

- `POST /admin/auth/login`
- `GET /admin/dashboard/summary`
- `GET /admin/products`
- `GET /admin/orders`
- `GET /admin/users`
- `GET /admin/marketing/overview`
- `GET /admin/pickup-sites`

## 统一响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```
