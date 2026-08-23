// api/payments.js — 支付端点统一入口(全部 fail-closed)
// Vercel 路由: /api/payments/(.*) -> /api/payments.js?target=$1
const { createDisabledPaymentHandler } = require("../lib/payment-disabled");
const { setNoStore } = require("../lib/auth-shared");

const handlers = {
  "create-checkout-session": createDisabledPaymentHandler("POST"),
  "fulfill-checkout": createDisabledPaymentHandler("POST"),
};

module.exports = async function handler(req, res) {
  const search = new URL(req.url, "https://yitenhuang.com").searchParams.get("target");
  const pathMatch = String(req.url || "").match(/\/api\/payments\/([^/?#]+)/);
  const target = search || (pathMatch ? pathMatch[1] : "");
  const selected = handlers[target];
  if (!selected) {
    setNoStore(res);
    res.status(404).json({ ok: false, message: "Unknown payment endpoint." });
    return;
  }
  await selected(req, res);
};
