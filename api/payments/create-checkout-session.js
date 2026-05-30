const catalog = {
  membership: {
    monthly: { title: "月度会员", amount: 1200, currency: "usd", description: "Yiten Huang 会员订阅" },
    yearly: { title: "年度会员", amount: 9900, currency: "usd", description: "Yiten Huang 会员订阅" },
  },
  ebook: {
    visitor: { title: "电子书：长期思考与个人系统", amount: 2900, currency: "usd", description: "游客电子书购买" },
    member: { title: "电子书：长期思考与个人系统（会员折扣）", amount: 1900, currency: "usd", description: "订阅会员电子书折扣购买" },
  },
};

const paymentMethods = {
  card: "card",
  wechat: "wechat_pay",
  alipay: "alipay",
};

const methodLabels = {
  card: "银行卡",
  wechat: "微信支付",
  alipay: "支付宝",
};

const readBody = (req) =>
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

const resolveItem = (body) => {
  if (body.product === "ebook") {
    const audience = body.audience === "member" ? "member" : "visitor";
    return { kind: "ebook", id: audience, item: catalog.ebook[audience] };
  }
  const plan = body.plan || "yearly";
  return { kind: "membership", id: plan, item: catalog.membership[plan] };
};

const createStripeSession = async (body) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL || "https://project-a4ft0.vercel.app";
  if (!secretKey) {
    return { status: 501, body: { message: "Stripe secret key is not configured. Complete Stripe onboarding and set STRIPE_SECRET_KEY." } };
  }

  const method = body.method;
  const stripeMethod = paymentMethods[method];
  const selected = resolveItem(body);
  if (!selected.item || !stripeMethod) return { status: 400, body: { message: "Invalid product, plan, or payment method" } };

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/?payment=success&type=${encodeURIComponent(selected.kind)}&item=${encodeURIComponent(selected.id)}&method=${encodeURIComponent(method)}`);
  params.append("cancel_url", `${siteUrl}/?payment=cancelled&type=${encodeURIComponent(selected.kind)}&item=${encodeURIComponent(selected.id)}&method=${encodeURIComponent(method)}`);
  params.append("payment_method_types[0]", stripeMethod);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", selected.item.currency);
  params.append("line_items[0][price_data][unit_amount]", String(selected.item.amount));
  params.append("line_items[0][price_data][product_data][name]", selected.item.title);
  params.append("line_items[0][price_data][product_data][description]", `${selected.item.description} - ${methodLabels[method]}`);
  params.append("metadata[type]", selected.kind);
  params.append("metadata[item]", selected.id);
  params.append("metadata[payment_method]", method);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const result = await response.json();
  if (!response.ok) return { status: response.status, body: { message: result.error?.message || "Stripe checkout failed" } };
  return { status: 200, body: { provider: "stripe", url: result.url, id: result.id } };
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  try {
    const body = await readBody(req);
    const provider = process.env.PAYMENT_PROVIDER || "stripe";
    if (provider !== "stripe") return res.status(501).json({ message: "This provider is not implemented yet. Use Stripe first, or add LianLian/PingPong adapter code." });
    const result = await createStripeSession(body);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to create checkout session" });
  }
};
