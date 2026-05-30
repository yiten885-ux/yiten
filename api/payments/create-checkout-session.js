const plans = {
  monthly: { title: "月度会员", amount: 1200, currency: "usd" },
  yearly: { title: "年度会员", amount: 9900, currency: "usd" },
};

const paymentMethods = {
  wechat: "wechat_pay",
  alipay: "alipay",
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

const createStripeSession = async ({ plan, method }) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL || "https://project-a4ft0.vercel.app";
  if (!secretKey) {
    return { status: 501, body: { message: "Stripe secret key is not configured. Complete Stripe onboarding and set STRIPE_SECRET_KEY." } };
  }
  const selectedPlan = plans[plan];
  const stripeMethod = paymentMethods[method];
  if (!selectedPlan || !stripeMethod) return { status: 400, body: { message: "Invalid plan or payment method" } };

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/?payment=success&plan=${encodeURIComponent(plan)}`);
  params.append("cancel_url", `${siteUrl}/?payment=cancelled&plan=${encodeURIComponent(plan)}`);
  params.append("payment_method_types[0]", stripeMethod);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", selectedPlan.currency);
  params.append("line_items[0][price_data][unit_amount]", String(selectedPlan.amount));
  params.append("line_items[0][price_data][product_data][name]", selectedPlan.title);
  params.append("metadata[plan]", plan);
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
    const result = await createStripeSession({ plan: body.plan, method: body.method });
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to create checkout session" });
  }
};
