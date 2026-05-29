# Cross-border payment bridge

The site now has a generic payment bridge for WeChat Pay and Alipay via a cross-border provider.

## Current implementation

- Frontend: `assets/payments.js`
- Backend entry: `api/payments/create-checkout-session.js`
- Default provider: Stripe Checkout
- Supported frontend methods: `wechat`, `alipay`

The backend creates a Stripe Checkout Session with `payment_method_types[0]` set to either `wechat_pay` or `alipay`.

## Why a provider account is still required

WeChat Pay and Alipay settlement cannot be completed by code alone. One of these must be approved first:

- Stripe account with Alipay / WeChat Pay available for the account and currency
- LianLian Pay cross-border merchant account
- PingPong cross-border merchant account

Until provider KYC and channel approval are complete, the page can show the payment options, but it cannot complete payment, settlement, and payout.

## Stripe setup

Set these environment variables on the backend host:

```bash
SITE_URL=https://yitenhuang.com
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_or_test_xxx
```

Use a test key first. After a successful test payment, switch to live credentials.

## LianLian / PingPong setup

The code currently reserves the provider switch, but LianLian and PingPong adapters need their official API credentials after your account is approved.

Expected future variables:

```bash
PAYMENT_PROVIDER=lianlian
LIANLIAN_MERCHANT_ID=replace_me
LIANLIAN_API_KEY=replace_me
LIANLIAN_WEBHOOK_SECRET=replace_me
```

or:

```bash
PAYMENT_PROVIDER=pingpong
PINGPONG_CLIENT_ID=replace_me
PINGPONG_CLIENT_SECRET=replace_me
PINGPONG_WEBHOOK_SECRET=replace_me
```

## End-to-end acceptance checklist

1. Backend host is deployed and serving `/api/payments/create-checkout-session`.
2. Provider account is approved.
3. Environment variables are set on the backend host.
4. A real checkout URL is returned for WeChat Pay and/or Alipay.
5. A successful payment reaches the provider dashboard.
6. Webhook confirms the payment and grants membership access.
7. Funds settle to the linked bank account according to provider payout timing.
