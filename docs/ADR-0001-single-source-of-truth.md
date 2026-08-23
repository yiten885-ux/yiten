# ADR-0001:GitHub `yiten` 仓库为唯一代码事实源

- 状态:已接受(2026-08-23,阶段 0)
- 关联:ADR-0002

## 背景

个人网站代码曾有三份互不同步的资产:

1. GitHub `yiten885-ux/yiten`(2026-05-30 第一版,PWA/分享/安装,13 个文件);
2. Vercel `project-a4ft0` Production 部署 `dpl_8tbvPVmRQdttaz9Hmdp1BbWu65SK`(2026-07-16,45 文件,含 admin/owner/creator/支付);
3. 本地 Vault `项目/个人网站/`(7-16 快照 + 8-04 P0 安全修复稿,62 文件)。

三份不一致导致:线上带已知 P0 漏洞、修复稿无法追溯、部署不可复现。

## 决策

- **GitHub `yiten885-ux/yiten` `main` 分支是站点源码的唯一事实源**,所有变更经提交进入;
- 以 7-16 Vercel Production 快照为基线、叠加 8-04 P0 安全修复稿的内容,作为 `main` 新基线;
- 本地 Vault 目录退化为工作副本,不再承担"唯一副本"职责;
- 部署只从 GitHub 触发(见 ADR-0003 部署链路),禁止手工上传覆盖线上。

## 后果

- 正面:单点真相、可回滚、可审计、CI 可挂接;
- 代价:推送前必须通过安全扫描(无真实凭据、无私有资产);
- 约束:`private-assets/`、`.env*`、`node_modules/`、`tests/` 永不入库(见 `.gitignore`/`.vercelignore`);发布前门禁见根 README「Release gates」。
