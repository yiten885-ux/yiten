# Yiten Personal Site

个人网站(yitenhuang.com)源码仓库。**当前是恢复 + P0 安全修复基线,尚未部署。**

## 状态

- 基线:2026-07-16 Vercel Production 快照(`dpl_8tbvPVmRQdttaz9Hmdp1BbWu65SK`,project-a4ft0)+ 2026-08-04 P0 安全修复稿。
- 线上 `yitenhuang.com` 仍运行 2026-07-16 旧部署,**存在已知 P0 风险;门禁未完成前不要部署本仓库**。
- 设计决策见 `docs/ADR-0001`(单一代码源)、`docs/ADR-0002`(路线 A 渐进式原生重构);工程规范见 `docs/CONVENTIONS.md`;部署见 `docs/DEPLOYMENT.md`。

## P0 安全修复摘要(已本地实现,26 项测试通过)

- 管理员认证:强制 `ADMIN_PASSWORD` + `AUTH_SECRET`,无回退;缺失即 503 fail-closed。
- Session:12 小时、`__Host-`、随机签名;过期/登出即清私有本地状态。
- 私有状态读写仅限同源管理员;公开内容走 `api/public/catalog.js` 只读投影;发布/联系方式显式启用。
- 公共上传、测试邮件均需同源管理员认证。
- Creator(注册/登录/KYC/发布)与支付(Stripe/PayPal/捕获/履约)整体 fail-closed,直到门禁完成。
- 付费文件移出 `public/`,由 `.gitignore`/`.vercelignore` 排除,永不入库、永不部署。
- Service Worker 仅缓存公开白名单,不处理 API 与受保护页。
- 微信无回退验证令牌;喜马拉雅签名默认禁用。
- 测试环境清空继承凭据,拒绝未 mock 的外网调用。

## 测试

要求 Node.js 20+;无需测试框架安装。

```bash
npm test        # node --test tests/security/*.test.js(当前 31 项)
```

## 释放门禁(Release gates)

1. 轮换所有可能暴露的生产凭据(admin/session/邀请/storage/集成)——**未完成,上线前必做**。
2. 审查并清理生产状态 Blob,私有值不进日志/不进 Git——**未完成**。
3. 实现服务端 Creator 账号、一次性邀请与租户授权后再启用 Creator——**未完成**。
4. 实现服务端支付目录 ID、verified webhooks、订单幂等、私有签名交付后再启用支付——**未完成**。
5. 生产级限流:登录、上传、公共计数、签名端点——**已实现**(`lib/rate-limit.js`,内存后端,5 个限流点接入;生产多实例建议接 Vercel KV 后端)。
6. 在受保护 Preview 环境验证后再 Production 部署——**未完成**。

## 目录

| 路径 | 说明 |
|---|---|
| `api/` | Vercel Serverless 函数(统一错误契约) |
| `lib/` | 服务端共享模块(auth/state/blob/email) |
| `assets/` | 客户端运行时(app/i18n/sync/payments/分享/PWA) |
| `public/` | 静态公开资产 |
| `private-assets/` | 私有资产(付费文件),永不入库/部署 |
| `tests/` | node:test 安全与行为测试 |
| `docs/` | ADR、规范、部署、恢复/修复记录 |
| `scripts/` | 本机工具(macOS 驱逐文件读取/水合:`vread.swift`、`hydrate.swift`) |

## 安全边界

- 任何真实凭据只存在于部署平台环境变量,绝不进入源码、测试、日志或 Git 历史。
- 本仓库为公开仓库:合并前请自检无凭据、无私有资产。
