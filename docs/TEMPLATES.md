# 模板规范(Templates)

路线 A「模块化模板」在零构建下的落地方式:**模板片段文件是权威源,页面内联展开并标注来源,测试防漂移**。

## 模板清单(assets/templates/)

| 文件 | 内容 | 使用页面 |
|---|---|---|
| `head-base.html` | 公共 head:charset/viewport/theme-color/字体/样式引用 | 全部页面 |
| `head-backend.html` | 后台页公共 head:charset/viewport/robots noindex/字体/样式(字体权重为页面差异,见模板注释) | admin / creator(owner 为例外) |
| `site-header.html` | 站点导航(index 版) | index(后台页有独立导航) |
| `site-footer.html` | 站点页脚(法律页链接) | index(后台页无) |
| `scripts-index.html` | index 脚本引入清单(顺序 + 版本约定) | index |

## 同步规则

1. **改模板 → 必须同步所有引用页面**(index 至少);`npm test` 的 templates 测试会校验页面包含模板内容行,漏同步即失败。
2. 页面差异部分(如 admin 的独立 head/导航/脚本)不属于公共模板,保持页面内差异。
3. head 的页面特定字段(title/OG/canonical/description)不放入模板,留在各页面,但**必须与 `head-base.html` 的公共行保持一致**。

## 脚本加载顺序(scripts-index.html)

依赖方向,勿乱序:

```
validate.js → catalog.js → sync.js → app.js → 功能模块(smart-share/payments/ximalaya/install/i18n)
```

- 版本号约定:`?v=YYYYMMDD-<slug>`;改动文件必须更新版本号(防浏览器与 Service Worker 缓存旧档)。
- 后台页(admin/owner)使用各自的 sync scope 与脚本集,遵循同一"校验层在前"原则。

## 防漂移测试

`tests/security/templates.test.js`:逐行校验 index.html 包含模板内容行;并校验脚本清单引用的文件真实存在。
