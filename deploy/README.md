# 生产部署说明

这套目录用于把“智能会员商城系统”部署到公网服务器。

当前仓库已经支持部署以下服务：

- API 服务
- 管理后台 Web
- 商城 H5 Web
- MySQL
- Redis
- Nginx 反向代理

## 目录说明

- `docker-compose.prod.yml`：生产环境 Docker 编排
- `env/api.env.example`：API 环境变量模板
- `env/mysql.env.example`：MySQL 环境变量模板
- `nginx/api.conf`：API 域名代理
- `nginx/admin-proxy.conf`：管理后台域名代理
- `nginx/mobile-proxy.conf`：商城 H5 域名代理
- `nginx/admin.conf`：管理后台容器内静态站点配置
- `nginx/mobile.conf`：商城 H5 容器内静态站点配置
- `scripts/bootstrap-ubuntu.sh`：Ubuntu 服务器初始化脚本
- `scripts/post-deploy-check.sh`：部署后自检脚本

## 推荐域名规划

- `api.yourdomain.com`：后端接口
- `admin.yourdomain.com`：管理后台
- `m.yourdomain.com`：商城 H5

## 推荐服务器配置

### 演示或内测

- 2 核 4G
- 60G SSD
- Ubuntu 22.04 LTS

### 正式运营起步

- 4 核 8G
- 80G SSD
- Ubuntu 22.04 LTS

## 部署前准备

1. 购买云服务器
2. 购买域名
3. 将域名解析到服务器公网 IP
4. 放通服务器安全组端口：`22`、`80`、`443`

## 环境变量

复制模板：

```bash
cp deploy/env/api.env.example deploy/env/api.env
cp deploy/env/mysql.env.example deploy/env/mysql.env
```

至少修改这些值：

- `JWT_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

## 修改域名

把下面配置中的示例域名替换为你的真实域名：

- `deploy/nginx/api.conf`
- `deploy/nginx/admin-proxy.conf`
- `deploy/nginx/mobile-proxy.conf`

## 设置前端 API 地址

在服务器执行部署前，设置：

```bash
export VITE_API_BASE_URL=https://api.yourdomain.com
```

## 启动生产服务

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## 服务验证

```bash
docker compose -f deploy/docker-compose.prod.yml ps
curl http://127.0.0.1
curl http://127.0.0.1/home
```

公网验证：

- `http://admin.yourdomain.com`
- `http://m.yourdomain.com`
- `http://api.yourdomain.com/home`

## HTTPS

如果已经完成域名解析，可以在服务器安装证书工具：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com -d m.yourdomain.com
```

## 微信小程序上线前提醒

如果目标是正式上架微信小程序，还需要完成：

- HTTPS
- 微信后台合法域名配置
- 中国大陆服务器备案
- 真实微信登录
- 真实微信支付

## 当前版本的现实说明

当前版本已经可以做公网演示和联调，但如果要长期商业化运行，建议下一步把商品、订单、会员、财务等业务运行态数据完全迁移到 MySQL 持久化，而不是仅依赖运行内存。
