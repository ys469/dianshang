# 微信小程序公网部署与上架指南

## 1. 当前本地地址

- 管理后台：`http://127.0.0.1:5173`
- 商城 H5：`http://127.0.0.1:57105`
- API：`http://127.0.0.1:3000`

这些地址只能用于本机调试。

如果你要做到下面这两件事，就必须部署到公网服务器：

1. 不在同一局域网下的其他电脑也能访问
2. 你的电脑关机后，别人仍然能访问

## 2. 真正的公网访问是什么

一套可长期访问的公网部署，至少包括：

1. 一台有公网 IP 的 Linux 云服务器
2. 一个正式域名
3. HTTPS 证书
4. Nginx 反向代理
5. 后端 API 服务
6. 管理后台站点
7. 商城 H5 站点
8. 小程序代码上传到微信平台

重点：

- 微信用户真正访问的是你服务器上的 API
- 小程序前端不是直接让用户访问服务器文件，而是发布到微信平台
- 所以服务器负责的是接口、后台、H5、支付回调和长期在线能力

## 3. 仓库里已经准备好的部署文件

- [API Dockerfile](/C:/Users/louyh/Documents/商店系统/apps/api/Dockerfile)
- [Admin Dockerfile](/C:/Users/louyh/Documents/商店系统/apps/admin/Dockerfile)
- [Mobile Dockerfile](/C:/Users/louyh/Documents/商店系统/apps/mobile/Dockerfile)
- [生产编排文件](/C:/Users/louyh/Documents/商店系统/deploy/docker-compose.prod.yml)
- [API 环境变量模板](/C:/Users/louyh/Documents/商店系统/deploy/env/api.env.example)
- [MySQL 环境变量模板](/C:/Users/louyh/Documents/商店系统/deploy/env/mysql.env.example)
- [部署说明](/C:/Users/louyh/Documents/商店系统/deploy/README.md)

## 4. 我已经替你做好的部分

这次我已经把仓库里能预先做的部署准备补好了：

1. 补齐了商城 H5 的生产 Dockerfile
2. 补齐了管理后台容器内 Nginx 配置
3. 补齐了商城 H5 容器内 Nginx 配置
4. 补齐了商城 H5 的公网反向代理配置
5. 扩展了 `docker-compose.prod.yml`，现在支持：
   - API
   - Admin
   - Mobile H5
   - MySQL
   - Redis
   - Nginx
6. 重写了部署文档和小程序上线说明
7. 增加了服务器初始化脚本与部署后自检脚本

## 5. 你还需要准备什么

### 最快可公网演示方案

- 中国香港节点云服务器
- 域名
- HTTPS

优点：

- 无需等大陆备案
- 上公网更快
- 适合先让别人电脑访问测试

### 正式微信小程序上线方案

- 中国大陆节点云服务器
- 域名
- ICP 备案
- HTTPS
- 微信合法域名配置
- 微信支付商户号

优点：

- 更适合长期正式运营
- 更符合微信正式上线要求

## 6. 推荐服务器配置

### 演示环境

- 2 核 4G
- 60G SSD
- Ubuntu 22.04 LTS

### 正式起步

- 4 核 8G
- 80G SSD
- Ubuntu 22.04 LTS

## 7. 域名规划

- `api.yourdomain.com`
- `admin.yourdomain.com`
- `m.yourdomain.com`

## 8. 服务器部署步骤

### 8.1 初始化服务器

把项目上传前，先在服务器执行：

```bash
bash deploy/scripts/bootstrap-ubuntu.sh
```

如果脚本还没上传，可以先手动执行：

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git curl nginx certbot python3-certbot-nginx
sudo systemctl enable docker
sudo systemctl start docker
```

### 8.2 拉取代码

```bash
cd /opt
git clone https://github.com/ys469/dianshang.git
cd dianshang
```

### 8.3 复制环境变量

```bash
cp deploy/env/api.env.example deploy/env/api.env
cp deploy/env/mysql.env.example deploy/env/mysql.env
```

### 8.4 修改环境变量

至少修改：

- `JWT_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### 8.5 修改域名配置

修改以下文件中的示例域名：

- `deploy/nginx/api.conf`
- `deploy/nginx/admin-proxy.conf`
- `deploy/nginx/mobile-proxy.conf`

### 8.6 设置前端 API 地址

```bash
export VITE_API_BASE_URL=https://api.yourdomain.com
```

### 8.7 启动服务

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

### 8.8 自检

```bash
bash deploy/scripts/post-deploy-check.sh
```

或手动执行：

```bash
docker compose -f deploy/docker-compose.prod.yml ps
curl http://127.0.0.1
curl http://127.0.0.1/home
```

### 8.9 配置 HTTPS

```bash
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com -d m.yourdomain.com
```

## 9. 怎样确认“别人电脑也能访问”

部署完成后，让另一台不在同一局域网的电脑访问：

- `https://admin.yourdomain.com`
- `https://m.yourdomain.com`
- `https://api.yourdomain.com/home`

只要对方能打开，就说明已经是公网访问，不再依赖你的本地电脑和局域网。

## 10. 微信小程序正式上架前还要做什么

1. 微信后台配置合法域名
2. 中国大陆域名完成备案
3. UniApp 工程配置真实 `AppID`
4. 接入正式微信登录
5. 接入正式微信支付
6. 上传开发版
7. 提交审核
8. 审核通过后发布

## 11. 正式上线前检查清单

- [ ] 域名已解析
- [ ] 服务器安全组已放行 22/80/443
- [ ] API 域名已配置 HTTPS
- [ ] 微信后台已配置合法域名
- [ ] 默认 JWT 密钥已替换
- [ ] 默认数据库密码已替换
- [ ] 已验证注册、登录、找回密码、充值、下单
- [ ] 已验证地址和手机号在后台可见
- [ ] 已接入真实微信登录
- [ ] 已接入真实微信支付
- [ ] 已准备隐私政策和用户协议

## 12. 官方参考入口

- [腾讯云轻量应用服务器](https://cloud.tencent.com/product/lighthouse)
- [腾讯云轻量创建实例文档](https://cloud.tencent.com/document/product/1207/44580)
- [阿里云 ECS](https://www.aliyun.com/product/ecs)
- [阿里云 ECS 快速入门](https://help.aliyun.com/zh/ecs/getting-started/)
- [阿里云 ICP 备案说明](https://help.aliyun.com/zh/icp-filing/basic-icp-service/product-overview/what-is-an-icp-filing)
- [微信小程序服务器域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html)
- [微信小程序备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)
- [微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- [wx.requestPayment](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/payment/wx.requestPayment.html)
