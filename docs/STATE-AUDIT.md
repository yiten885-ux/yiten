# 生产状态 Blob 审计(Release gate #2)

目的:线上 `site-state` 状态 Blob 中可能残留旧版私有数据(创作者、订阅者、支付相关)。上线前须审查并清理,私有值不进日志、不进 Git。

## 状态结构(见 `lib/site-state.js`)

状态为 `{ version, items }`,按键分类:

### 私有键(`isPrivateKey` 命中,仅管理员可读写)
| 键 | 内容 | 处置建议 |
|---|---|---|
| `yiten-creator-accounts` | 旧版浏览器端创作者账号 | **清除**——Creator 已 fail-closed,数据不可信 |
| `yiten-creator-review-queue` / `content-review-queue` | 审核队列 | **清除** |
| `yiten-creator-invites` | 邀请码 | **清除**(含可能暴露的邀请凭据) |
| `yiten-creator-work:*` / `books:*` / `offers:*`(前缀) | 创作者作品 | **审查后清除**或迁移到新租户模型 |
| `personal-site-subscribers` | 订阅者邮箱 | **审查**——若为真实订阅,按隐私政策保留但脱敏迁移;否则清除 |
| `yiten-share-rewards-v1` | 分享奖励 | 审查,若不再使用则清除 |
| `yiten-work-views` | 浏览计数 | 保留(公开投影已限流) |
| `yiten-offer` | 优惠/报价 | 审查,若与禁用支付相关则清除 |
| `yiten-admin-draft` | 后台草稿 | 审查后保留或清除 |

### 公开键(`publicKeys`,经 `api/public/catalog.js` 只读投影)
公开作品/联系方式/封面等。**联系方式等个人信息是显式 opt-in 发布**,若旧数据未经 opt-in,应清除。

## 审计流程

1. 用管理员会话读取线上状态(或直接查 Blob Store 中的状态文件);
2. 对照上表逐键处置,记录处置结果(不复制私有值到文档);
3. 清除动作通过 `api/sync` 的 POST(服务端时间戳)或直接改 Blob 完成;
4. 处置后重新生成公开投影,确认公开输出不含私有键(回归由测试覆盖);
5. 处置记录写入本文件附录(键名 + 处置 + 日期,不含值)。

## 附录:处置记录

| 日期 | 键 | 处置 | 备注 |
|---|---|---|---|
| 2026-08-25 | `yiten-creator-accounts` | **清除** | 含 passwordHash/KYC/支付账户,浏览器端旧实现,Creator 已禁用 |
| 2026-08-25 | `yiten-creator-invites` | **清除** | 含邀请 token/inviteUrl |
| 2026-08-25 | `yiten-creator-work:yiten885@gmail.com` | **清除** | 键名含个人邮箱,Creator 已禁用 |
| 2026-08-25 | `yiten-creator-content-review-queue` | **清除** | 空数组 |
| 2026-08-25 | `yiten-creator-review-queue` | **清除** | 空数组 |
| 2026-08-25 | `yiten-admin-draft` | 保留 | 后台草稿(非敏感内容) |
| 2026-08-25 | `yiten-share-rewards-v1` | 保留 | 站点分享解锁功能数据 |
| — | 公开键(works/products/contact/views/updated-at) | 保留 | 未改动,线上 catalog 验证 17 作品正常 |

> 执行方式:下载原状态备份(`/tmp/yiten-site-state-backup-*.json`)→ 删除 5 个 Creator 键 → CLI `blob copy` 写回确切 pathname → 删除中间产物。私有值未进入仓库/日志。

> 注:本仓库 `tests/security/p0-boundaries.test.js` 已断言:公开投影输出键白名单、私有哨兵键不泄露;处置后必须保持该回归通过。
