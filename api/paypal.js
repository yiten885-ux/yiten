// api/paypal.js — PayPal 端点统一入口(全部 fail-closed)
// Vercel 路由: /api/paypal/(.*) -> /api/paypal.js?target=$1
const { createDisabledPaymentHandler } = require("../lib/payment-disabled");
const { setNoStore } = require("../lib/auth-shared");

const handlers = {
  "create-order": createDisabledPaymentHandler("POST"),
  "capture-order": createDisabledPaymentHandler("POST"),
  "client-config": createDisabledPaymentHandler("GET"),
};

module.exports = async function handler(req, res) {
  const search = new URL(req.url, "https://yitenhuang.com").searchParams.get("target");
  const pathMatch = String(req.url || "").match(/\/api\/paypal\/([^/?#]+)/);
  const target = search || (pathMatch ? pathMatch[1] : "");
  const selected = handlers[target];
  if (!selected) {
    setNoStore(res);
    res.status(404).json({ ok: false, message: "Unknown PayPal endpoint." });
    return;
  }
  await selected(req, res);
};
