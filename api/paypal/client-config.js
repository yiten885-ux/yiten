module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ message: "Method not allowed" });

  if (!process.env.PAYPAL_CLIENT_ID) {
    return response.status(501).json({ message: "PayPal client id is not configured" });
  }

  response.status(200).json({
    clientId: process.env.PAYPAL_CLIENT_ID,
    currency: "USD",
    environment: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  });
};
