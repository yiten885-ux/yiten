# Payment Setup

This site now has a paid membership checkout surface and PayPal serverless
endpoints. A static GitHub Pages site cannot safely hold payment secrets or
verify payment callbacks, so real money collection must run through a backend
host such as Vercel, Netlify, Cloudflare Workers, or your own server.

## PayPal

1. Create a PayPal developer app and get:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
2. Deploy the site to a backend-capable host.
3. Add environment variables:
   - `PAYPAL_ENV=sandbox` for testing, or `PAYPAL_ENV=live` for real payments
   - `PAYPAL_CLIENT_ID=...`
   - `PAYPAL_CLIENT_SECRET=...`
4. Replace `REPLACE_WITH_PAYPAL_CLIENT_ID` in `assets/app.js` with the public
   PayPal Client ID.
5. Test a sandbox payment, confirm capture succeeds, then switch to live.

The implemented endpoints are:

- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order`

## WeChat Pay and Alipay

Official WeChat Pay and Alipay integrations require merchant approval, keys,
certificates, callback URLs, and server-side signature verification. For a
personal creator site, the practical path is:

1. Open or verify merchant accounts.
2. Decide whether to use official direct integration or an aggregator that
   supports both WeChat Pay and Alipay.
3. Add server endpoints for order creation, payment result callbacks, and
   subscription entitlement updates.
4. Put the generated payment URL or QR-code URL into `paymentConfig.wechatPayUrl`
   and `paymentConfig.alipayUrl` in `assets/app.js`.

Do not put merchant private keys, PayPal secrets, WeChat API v3 keys, or Alipay
private keys in the browser.
