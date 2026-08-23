# 凭据轮换清单(Release gate #1)

目的:8-04 修复稿 README 明确"轮换所有可能暴露的生产凭据"。任何曾进入旧版源码/日志/Git 历史的凭据都必须轮换。**上线前必做。**

## 轮换总原则

1. 每个凭据只在部署平台环境变量中存在,绝不进入源码/测试/日志/Git;
2. 轮换顺序:先改平台环境变量 → 再在 Preview 验证 → 最后切换线上;
3. 轮换后旧值立即失效,不保留 fallback(本仓库所有集成已 fail-closed,无回退值)。

## 凭据清单

| # | 凭据 | 所在环境变量 | 用途 | 当前状态 | 轮换动作 |
|---|---|---|---|---|---|
| 1 | 管理员口令 | `ADMIN_PASSWORD` | 后台登录 | 需新建 | 生成强随机口令,仅存密码管理器 |
| 2 | 会话签名密钥 | `AUTH_SECRET` | 签名 admin session | 需新建 | `openssl rand -hex 32`,至少 32 字节 |
| 3 | Blob 读写令牌 | `BLOB_READ_WRITE_TOKEN` | 媒体上传 | 旧值可能暴露 | Vercel 面板删除旧 Blob Store → 新建 Store → 新 token |
| 4 | 状态读写令牌 | `YITEN_STATE_READ_WRITE_TOKEN` | 私有状态读写 | 旧值可能暴露 | 同上,新建随机串 |
| 5 | 微信验证令牌 | `WECHAT_TOKEN` | 公众号回调验证 | 旧值可能暴露 | 公众号后台重置 Token 并同步环境变量 |
| 6 | 喜马拉雅 AppKey/Secret | `XIMALAYA_APP_KEY` / `XIMALAYA_APP_SECRET` | JSSDK 签名(默认禁用) | 保留但确认未泄漏 | 若泄漏则到喜马拉雅开放平台重置;保持 `XIMALAYA_SIGNING_ENABLED=false` |
| 7 | Stripe 密钥 | `STRIPE_SECRET_KEY` | 支付(已禁用) | 旧值可能暴露 | 若曾入库:Stripe 后台 Rotate key;保持端点 fail-closed |
| 8 | PayPal 客户端凭据 | `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | 支付(已禁用) | 旧值可能暴露 | PayPal Developer 后台重置;保持端点 fail-closed |
| 9 | 邮件 API 密钥 | `RESEND_API_KEY` | 邮件(已禁用) | 旧值可能暴露 | 若曾入库:重置;保持 fail-closed |
| 10 | Cloudflare 令牌 | (Cloudflare 面板) | DNS/域名 | 检查 | 若曾出现在本机导出文件,立即轮换 |
| 11 | Vercel 账号令牌 | (Vercel 面板) | 部署 | 检查 | 若曾有 CLI token 泄漏,撤销并重新登录 |
| 12 | GitHub PAT | (gh keyring) | 推送/CI | 检查 | 若曾写入明文文件,撤销重建 |

## 历史暴露面(需重点核查)

- 2026-05-30 第一版代码曾公开在 GitHub(`yiten885-ux/yiten` 历史提交),**所有该版本中出现过的凭据一律视为已暴露**;
- 本地 Vault 中的 `.smart-env` 缓存、`cloudflare-yiten885@gmail.com-*.txt`、`sk-ws-*.` 文件:逐项检查是否含真实凭据,处理后清理;
- 线上 2026-07-16 部署运行期间的所有集成凭据视为可能暴露。

## 验证方式

轮换完成后,在 Preview 环境执行:

```bash
npm test                                        # 32 项安全回归
# 未配置时登录返回 503、上传返回 503、支付/签名返回 503 或 405
```

确认全部 fail-closed 行为符合预期后再考虑上线。
