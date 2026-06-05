# 腾讯云短信接入说明

当前项目已经支持两种短信模式：

1. `SMS_PROVIDER=mock`
   本地开发模式，接口会返回 `debugCode`，方便你直接测试注册和重置密码。
2. `SMS_PROVIDER=tencent`
   生产可用模式，验证码会通过腾讯云短信下发到真实手机号。

## 一、先在本地跑通

在 `apps/api/.env` 中先使用：

```env
SMS_PROVIDER=mock
SMS_CODE_EXPIRES_SECONDS=300
SMS_CODE_COOLDOWN_SECONDS=60
```

这样你点击“发送验证码”后，前端会直接显示开发验证码，先确认注册、忘记密码、登录整个流程都正常。

## 二、开通腾讯云短信

1. 登录腾讯云控制台。
2. 开通“短信”服务。
3. 完成企业或个人实名认证。
4. 申请短信签名。
5. 创建两个短信模板：
   - 注册验证码模板
   - 重置密码验证码模板
6. 记录以下信息：
   - `SecretId`
   - `SecretKey`
   - `SmsSdkAppId`
   - 短信签名
   - 注册模板 ID
   - 重置密码模板 ID

## 三、模板参数要求

当前代码发送腾讯云短信时会传两个模板参数：

1. 验证码
2. 失效分钟数

所以你的短信模板内容要和这个参数顺序一致，例如：

```text
您的验证码为 {1}，{2} 分钟内有效，请勿泄露给他人。
```

## 四、服务器环境变量

在服务器的 API 环境变量里配置：

```env
SMS_PROVIDER=tencent
SMS_CODE_EXPIRES_SECONDS=300
SMS_CODE_COOLDOWN_SECONDS=60
TENCENTCLOUD_SECRET_ID=你的SecretId
TENCENTCLOUD_SECRET_KEY=你的SecretKey
SMS_TENCENT_APP_ID=你的SmsSdkAppId
SMS_TENCENT_SIGN_NAME=你的短信签名
SMS_TENCENT_TEMPLATE_ID_REGISTER=注册模板ID
SMS_TENCENT_TEMPLATE_ID_RESET_PASSWORD=重置密码模板ID
SMS_TENCENT_REGION=ap-guangzhou
```

如果服务器同时部署了 Redis，验证码会优先写入 Redis；如果 Redis 暂时不可用，系统会自动退回内存存储。

## 五、部署后自测

建议按这个顺序验收：

1. 发送注册验证码
2. 用正确验证码注册新会员
3. 用错误验证码确认会被拦截
4. 发送重置密码验证码
5. 用正确验证码重置密码
6. 用旧密码登录失败
7. 用新密码登录成功

## 六、常见问题

### 1. 收不到短信

优先检查：

- 腾讯云短信签名是否审核通过
- 模板是否审核通过
- 模板参数个数是否匹配
- 账号是否欠费
- 手机号是否被运营商拦截

### 2. 本地开发想直接看到验证码

保持 `SMS_PROVIDER=mock` 即可，接口会返回 `debugCode`。

### 3. 想换成阿里云短信

当前代码先接的是腾讯云短信。后续如果你要换成阿里云，我可以继续把 `SmsSenderService` 扩成多供应商模式。
