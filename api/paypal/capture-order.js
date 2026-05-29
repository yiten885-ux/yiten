const paypalBaseUrl =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
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

  if (!response.ok) {
    throw new Error("PayPal access token request failed");
  }

  const token = await response.json();
  return token.access_token;
}

async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { orderId } = request.body || {};
    if (!orderId) {
      response.status(400).json({ message: "Missing PayPal order id" });
      return;
    }

    const accessToken = await getAccessToken();
    const captureResponse = await fetch(
      `${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const capture = await captureResponse.json();
    if (!captureResponse.ok) {
      response.status(captureResponse.status).json({
        message: capture.message || "PayPal capture failed",
        details: capture,
      });
      return;
    }

    response.status(200).json({
      status: capture.status,
      orderId: capture.id,
    });
  } catch (error) {
    response.status(500).json({ message: error.message || "Payment server error" });
  }
}

module.exports = handler;
