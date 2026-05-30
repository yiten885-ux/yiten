const catalog = {
  membership: {
    monthly: { amount: "12.00", currency: "USD", label: "Yiten Huang Monthly Membership" },
    yearly: { amount: "99.00", currency: "USD", label: "Yiten Huang Yearly Membership" },
  },
  ebook: {
    visitor: { amount: "29.00", currency: "USD", label: "Ebook: Long-term Thinking and Personal Systems" },
    member: { amount: "19.00", currency: "USD", label: "Ebook: Long-term Thinking and Personal Systems - Member Price" },
  },
};

const paypalBaseUrl =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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
    return catalog.ebook[audience];
  }
  return catalog.membership[body.plan || "yearly"];
};

async function getAccessToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured");
  }

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const token = await response.json();
  if (!response.ok) {
    throw new Error(token.error_description || token.error || "PayPal access token request failed");
  }

  return token.access_token;
}

async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = await readBody(request);
    const item = resolveItem(body);

    if (!item) {
      response.status(400).json({ message: "Unknown product or subscription plan" });
      return;
    }

    const accessToken = await getAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: item.label,
            amount: {
              currency_code: item.currency,
              value: item.amount,
            },
          },
        ],
      }),
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      response.status(orderResponse.status).json({
        message: order.message || order.details?.[0]?.description || "PayPal order creation failed",
        details: order,
      });
      return;
    }

    response.status(200).json({ id: order.id });
  } catch (error) {
    response.status(500).json({ message: error.message || "Payment server error" });
  }
}

module.exports = handler;
