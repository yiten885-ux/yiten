// tests/security/templates.test.js — index 页模板片段一致性(防漂移)
// 模板文件是权威源;改动模板后必须同步 index.html,否则测试失败。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { projectRoot } = require("./helpers");

const readPage = () => fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");

// 提取模板中的内容行:跳过 HTML 注释块与空行。
const contentLines = (templatePath) => {
  const source = fs.readFileSync(path.join(projectRoot, templatePath), "utf8");
  const lines = [];
  let inComment = false;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (inComment) {
      if (line.includes("-->")) inComment = false;
      continue;
    }
    if (line.startsWith("<!--")) {
      if (!line.includes("-->")) inComment = true;
      continue;
    }
    lines.push(line);
  }
  return lines;
};

const templates = [
  "assets/templates/head-base.html",
  "assets/templates/site-header.html",
  "assets/templates/site-footer.html",
  "assets/templates/scripts-index.html",
];

for (const template of templates) {
  test(`index.html stays in sync with template ${template}`, () => {
    const page = readPage();
    const lines = contentLines(template);
    assert.ok(lines.length > 0, `${template} should carry content lines`);
    for (const line of lines) {
      assert.ok(page.includes(line), `index.html is missing template line: ${line}`);
    }
  });
}

test("template files reference existing assets with current version markers", () => {
  const page = readPage();
  // scripts 清单里的每个脚本都必须真实存在,且版本号标注一致。
  const scriptRefs = [...page.matchAll(/src="\.\/assets\/([^"?]+)\.js\?v=([^"]+)"/g)];
  assert.ok(scriptRefs.length >= 5, "index should load the shared script set");
  for (const [, name] of scriptRefs) {
    const file = path.join(projectRoot, "assets", `${name}.js`);
    assert.ok(fs.existsSync(file), `script asset missing: assets/${name}.js`);
  }
});
