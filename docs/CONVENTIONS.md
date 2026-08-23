# 目录与工程规范(Conventions)

本仓库遵循路线 A(零构建原生重构)与安全边界约束。所有变更须通过本规范评审。

## 目录职责

| 路径 | 职责 | 约束 |
|---|---|---|
| `index.html` / `admin.html` / `owner.html` / `creator.html` / 法律页 | 页面骨架(只含结构与内联安全头) | 不内联业务逻辑 |
| `assets/` | 客户端运行时:页面脚本、样式、i18n、PWA、分享、支付 | 统一走 `app.js` 运行时 |
| `lib/` | 服务端共享模块:认证、状态、存储、邮件 | 不 import 私有凭据 |
| `api/` | Vercel Serverless 函数(每路由一个入口) | 统一错误契约;禁止匿名危险操作 |
| `public/` | 静态公开资产 | 禁止付费/私有内容 |
| `private-assets/` | 私有资产(付费文件等) | **永不入库、永不部署**(`.gitignore` + `.vercelignore`) |
| `tests/` | node:test 测试 | 测试环境必须清空继承凭据、拒绝未 mock 的外网调用 |
| `docs/` | ADR、规范、恢复/修复记录 | ADR 一经接受不修改,只追加新 ADR |

## 安全基线(从 8-04 P0 修复稿继承,不可回退)

1. 管理认证强制 `ADMIN_PASSWORD` + `AUTH_SECRET`,缺失即 503 fail-closed;
2. Session:12h、`__Host-`、随机签名;登出/过期即清私有本地状态;
3. 私有状态读写仅限同源管理员;公开读走 `api/public/catalog.js` 只读投影;
4. Creator 与支付保持 fail-closed,直到各自门禁(见 README Release gates)完成;
5. Service Worker 仅缓存公开白名单,绝不缓存 API 与受保护页;
6. 测试不得访问生产 Blob/邮件/支付服务。

## 提交规范

- 提交信息:动词 + 对象 + 原因(`Rebase onto ...` / `Add rate limiting for login`);
- 推送前自检:无真实凭据(`sk-`/`ghp_`/`AKIA`/空值占位之外),无 `private-assets/`、无 `.env*`;
- 部署只经 GitHub → Vercel;禁止手工上传覆盖线上。

## 测试规范

```bash
npm test          # node --test tests/security/*.test.js(当前 26 项)
```

新增模块必须带测试;API 行为变化必须更新契约测试。
