const siteUrl = () => process.env.SITE_URL || "https://yitenhuang.com";
const defaultOwnerEmail = "yiten885@gmail.com";

const deliveryCatalog = {
  membership: {
    monthly: { title: "月度会员", description: "会员内容、播客与电子书会员价权益。", files: ["会员权益开通说明"] },
    quarterly: { title: "季度会员", description: "季度会员内容、播客与电子书会员价权益。", files: ["会员权益开通说明"] },
    yearly: { title: "年度会员", description: "年度会员内容、播客与电子书会员价权益。", files: ["会员权益开通说明"] },
  },
  ebook: {
    visitor: { title: "电子书：《只富一次》三部曲单本", description: "单本电子书交付与阅读入口。", files: ["PDF/EPUB/MOBI 电子书"] },
    member: { title: "电子书：《只富一次》三部曲单本（会员价）", description: "会员价单本电子书交付与阅读入口。", files: ["PDF/EPUB/MOBI 电子书"] },
    book1: { title: "《只富一次：普通人的财富守恒法则》", description: "第一册电子书交付与阅读入口。", files: ["PDF/EPUB/MOBI 电子书"] },
    book2: { title: "《守住财富：消费陷阱与资产配置》", description: "第二册电子书交付与阅读入口。", files: ["PDF/EPUB/MOBI 电子书"] },
    book3: { title: "《永不返贫：家庭防坠落系统》", description: "第三册电子书交付与阅读入口。", files: ["PDF/EPUB/MOBI 电子书"] },
    bundle: { title: "《只富一次》三部曲套装与工具包", description: "三部曲、工具表格、音频笔记和资料包。", files: ["三部曲电子书", "家庭风险地图", "现金流修复表", "30 天行动清单", "配套音频"] },
    "member-bundle": { title: "《只富一次》三部曲套装与工具包（会员价）", description: "会员价三部曲、电子书、音频笔记和资料包。", files: ["三部曲电子书", "家庭风险地图", "现金流修复表", "30 天行动清单", "配套音频"] },
    extra1: { title: "补充资料包 1", description: "创作者上架的补充资料包。", files: ["补充资料包"] },
    extra2: { title: "补充资料包 2", description: "创作者上架的补充资料包。", files: ["补充资料包"] },
  },
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") return resolve(JSON.parse(req.body || "{}"));
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
    req.on("error", reject);
  });

const getDeliveryItem = ({ product = "membership", audience, plan, itemTitle, itemDescription } = {}) => {
  if (product === "ebook" && itemTitle) {
    const fallback = deliveryCatalog.ebook[audience || "visitor"] || deliveryCatalog.ebook.visitor;
    return {
      ...fallback,
      title: String(itemTitle).slice(0, 120),
      description: itemDescription || fallback.description,
    };
  }
  if (product === "ebook") return deliveryCatalog.ebook[audience || "visitor"];
  return deliveryCatalog.membership[plan || "yearly"];
};

const sendResendEmail = async ({ to, subject, html, bcc = [] }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Yiten Huang <onboarding@resend.dev>",
      to,
      bcc,
      subject,
      html,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.name || "Resend email failed.");
  }
  return result;
};

const deliveryHtml = ({ item, orderId, provider, amount, currency, purchasedAt }) => {
  const files = (item.files || []).map((name) => `<li>${name}</li>`).join("");
  const downloadLink = item.downloadPath
    ? `<p><strong>下载资料：</strong><a href="${siteUrl()}${item.downloadPath}">${siteUrl()}${item.downloadPath}</a></p>`
    : "";
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.7;color:#17211f">
      <h2>你的资料已经交付</h2>
      <p>你好，你购买的 <strong>${item.title}</strong> 已完成交付记录。</p>
      <p>${item.description || ""}</p>
      <ul>${files}</ul>
      ${downloadLink}
      <p><strong>交付入口：</strong><a href="${siteUrl()}#books">${siteUrl()}#books</a></p>
      <hr />
      <p><strong>订单号：</strong>${orderId}</p>
      <p><strong>支付渠道：</strong>${provider}</p>
      <p><strong>金额：</strong>${currency ? currency.toUpperCase() : "USD"} ${amount || ""}</p>
      <p><strong>交付时间：</strong>${purchasedAt || new Date().toISOString()}</p>
      <p style="color:#6f6a61">这封邮件同时作为交付记录。若无法打开资料入口，请直接回复此邮件。</p>
    </div>
  `;
};

const sendDeliveryEmail = async ({ to, item, orderId, provider, amount, currency, purchasedAt }) => {
  if (!to) throw new Error("Missing recipient email.");
  if (!item) throw new Error("Missing delivery item.");
  const ownerLogEmail = process.env.DELIVERY_LOG_EMAIL || defaultOwnerEmail;
  return sendResendEmail({
    to,
    bcc: ownerLogEmail && ownerLogEmail !== to ? [ownerLogEmail] : [],
    subject: `交付记录：${item.title}`,
    html: deliveryHtml({ item, orderId, provider, amount, currency, purchasedAt }),
  });
};

module.exports = {
  defaultOwnerEmail,
  deliveryCatalog,
  getDeliveryItem,
  readJsonBody,
  sendDeliveryEmail,
  sendResendEmail,
};
