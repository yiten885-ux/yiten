# P0 Security Remediation Record

## Scope

This record covers only confirmed P0 security paths in the recovered Vercel source. It does not claim the site is ready for release.

| P0 path | Local remediation | Regression evidence |
|---|---|---|
| Hardcoded admin credential and signing fallbacks | Removed; both environment settings are mandatory | Missing configuration returns 503; bad password is rejected |
| Ten-year reusable admin session | Replaced with a 12-hour randomized, signed `__Host-` session | Future, expired, tampered and old-secret sessions fail |
| Anonymous global state read/write | `/api/sync/state` is admin-only and same-origin for writes | Anonymous GET/POST return 401 |
| Private data sent to every visitor | Added `/api/public/catalog`; publication and contact are explicit opt-ins, email-shaped authors are removed, and views are limited to published-work counts | Exact output-key allowlists and private sentinels cover every private key family |
| Client timestamp lockout | Server assigns update timestamps | Client future timestamps are ignored |
| Anonymous public uploads | Both upload paths require same-origin admin authentication | Unauthorized requests stop before Blob calls |
| Browser-only Creator identity/KYC | Creator sync and UI workflows are disabled | Creator page is fail-closed and performs no sync/upload |
| Client-controlled payment price/entitlement and replayable fulfillment | Checkout, PayPal, capture and fulfillment endpoints are disabled | All return 503 without external calls; fulfillment GET returns 405 |
| Public paid archive | Removed from `public/`; excluded by `.gitignore` and `.vercelignore` | Test asserts public path is absent |
| Unauthenticated test email | Restricted to same-origin admin and fixed owner/test recipient | Anonymous request returns 401 before email call |
| Hardcoded WeChat verification token | Removed fallback; missing setting returns 503 | Default fail-closed test |
| Public signing oracle | Ximalaya signing disabled by default, with origin and payload checks behind the gate | Default fail-closed test |
| Service Worker caches APIs/protected pages | Cache allowlist, sensitive-route bypass, v6 cache cleanup | Behavioral VM tests cover install, fetch and activation |
| Local `sessionStorage` admin unlock | Removed; private sync starts only after `/api/auth/status` succeeds | Static and client behavior tests |
| Private state remains on a shared browser after logout/expiry | Sync lifecycle now stops and clears current plus legacy private local/session storage | Expired-session VM test proves clearing, timer removal and no later push |
| Legacy state reaches public/Admin/Owner rendering before fresh sync | Old public content keys are ignored/removed; local content requires explicit publication; dynamic values are escaped, executable URLs rejected, rich HTML sanitized and rich-editor paste reduced to text | Stored-XSS and URL-policy assertions cover public works/contact/covers plus Admin invites, reviews, KYC, QR and Owner prices |
| Security tests inherit real provider credentials | Test setup removes all provider/state credentials and denies unmocked external fetches | Tests cannot reach production Blob, email or payment services by default |

## Verification command

```bash
npm test
```

Current local result: 26 tests passed, 0 failed.

The recovery snapshot remains the immutable source-of-truth for comparison. No deployment or remote push is part of this work.
