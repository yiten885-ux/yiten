# Ximalaya integration

This site is prepared for Ximalaya Open Platform H5/JSSDK playback.

## What is already wired

- `assets/ximalaya.js` loads the Ximalaya H5 JSSDK.
- The public `app_key` is configured in the browser.
- `api/ximalaya/jssdk-sign.js` creates the `signature` required by the JSSDK.
- The existing podcast section is enhanced after page load.

## Required production settings

Set these environment variables on the backend host, such as Vercel, Netlify Functions, or a Node server:

```bash
XIMALAYA_APP_KEY=3205f127eb7fff523d8d91b1a8bb0e6b
XIMALAYA_APP_SECRET=replace_with_the_secret_from_ximalaya
```

Do not commit `XIMALAYA_APP_SECRET` to GitHub. If the secret has been shown in screenshots or chat, rotate it in the Ximalaya developer console before production launch.

## Add real podcast episodes

Edit `assets/ximalaya.js` and replace the empty `trackIds` list with real Ximalaya sound IDs:

```js
trackIds: [123456789, 987654321]
```

The JSSDK player expects Ximalaya sound IDs in the `playlist` array.

## Hosting note

GitHub Pages can only serve static files. It cannot run `api/ximalaya/jssdk-sign.js`. To make Ximalaya playback work end to end, deploy the same repository to a backend-capable host or deploy only the signature API somewhere else and set `signatureEndpoint` in `assets/ximalaya.js` to that public HTTPS URL.

## Ximalaya review note

The Ximalaya app is currently in development mode. After the real track IDs and signature endpoint are working, submit the app review in the Ximalaya developer console. Production usage may remain limited until the app is approved.
