# 部署链路:GitHub → Vercel(阶段 0 建立)

目标:让 `main` 推送即触发 Vercel Preview 部署,手动 Promote 到 Production;替代 2026-07-16 的手工上传方式。

## 前置条件

- GitHub 仓库 `yiten885-ux/yiten`(已就绪,public,`main`);
- Vercel 账号(曾部署 `project-a4ft0`);
- 域名 `yitenhuang.com` 已指向 Vercel(CNAME,Cloudflare)。

## 连接步骤(需在 Vercel 面板操作,一次性)

1. 登录 vercel.com → **Add New → Project** → Import Git Repository → 选择 `yiten885-ux/yiten`;
2. Framework Preset 选择 **Other**(本仓库是零构建静态 + Serverless 函数,由 `vercel.json` 驱动构建配置);
3. Root Directory 保持 `/`;
4. 环境变量(Production + Preview 各一份):
   - `ADMIN_PASSWORD`、`AUTH_SECRET`(必填,缺失会 503 fail-closed);
   - `BLOB_READ_WRITE_TOKEN`(Vercel Blob);
   - `YITEN_STATE_READ_WRITE_TOKEN`;
   - `WECHAT_TOKEN`、`XIMALAYA_SIGNING_ENABLED=false`(默认禁用,勿开);
   - `PUBLIC_VIEW_TRACKING_ENABLED=false`;
5. Deploy → 生成 Preview URL;
6. Production 域名:Settings → Domains → 添加 `yitenhuang.com`。

## 发布流程(门禁通过后)

1. 推送 `main` → 自动 Preview 部署;
2. Preview 上跑 `npm test` 回归与手动验收;
3. Vercel 面板 Promote → Production;
4. 回滚:Vercel 面板选择历史 Deployment → Redeploy。

## 当前状态(阶段 0 结束时)

- 代码源:已推回 GitHub(见提交历史);
- Vercel 项目连接:**待用户在面板完成**;
- 线上 `yitenhuang.com` 仍为 2026-07-16 旧部署,**存在 P0 风险,在门禁与 Preview 验证完成前不要 Promote**。
