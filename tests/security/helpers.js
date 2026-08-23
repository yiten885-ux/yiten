const { EventEmitter } = require("node:events");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
const securityEnvKeys = [
  "ADMIN_PASSWORD",
  "AUTH_SECRET",
  "BLOB_READ_WRITE_TOKEN",
  "STATE_BLOB_READ_WRITE_TOKEN",
  "YITEN_STATE_READ_WRITE_TOKEN",
  "VERCEL_BLOB_API_URL",
  "VERCEL_BLOB_API_VERSION_OVERRIDE",
  "PUBLIC_VIEW_TRACKING_ENABLED",
  "WECHAT_TOKEN",
  "XIMALAYA_APP_KEY",
  "XIMALAYA_APP_SECRET",
  "XIMALAYA_SIGNING_ENABLED",
  "STRIPE_SECRET_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "TEST_EMAIL_TO",
  "DELIVERY_LOG_EMAIL",
  "SITE_URL",
];

let unexpectedExternalFetchCount = 0;
const denyExternalFetch = async () => {
  unexpectedExternalFetchCount += 1;
  throw new Error("Security tests must not reach external networks without an explicit mock.");
};

const resetSecurityEnv = () => {
  securityEnvKeys.forEach((key) => delete process.env[key]);
  unexpectedExternalFetchCount = 0;
  global.fetch = denyExternalFetch;
};

const getUnexpectedExternalFetchCount = () => unexpectedExternalFetchCount;

const clearProjectModules = () => {
  Object.keys(require.cache).forEach((file) => {
    if (file.startsWith(`${projectRoot}${path.sep}`) && !file.includes(`${path.sep}tests${path.sep}`)) {
      delete require.cache[file];
    }
  });
};

const requireProject = (relativePath) => require(path.join(projectRoot, relativePath));

const createRequest = ({ method = "GET", url = "/", headers = {}, body, query = {} } = {}) => {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  req.body = body;
  req.query = query;
  return req;
};

const createResponse = () => {
  const headers = new Map();
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    headers,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
      return this;
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      this.ended = true;
      return this;
    },
    send(value) {
      this.body = value;
      this.ended = true;
      return this;
    },
    end(value) {
      this.body = value;
      this.ended = true;
      return this;
    },
  };
};

const invoke = async (handler, options) => {
  const req = createRequest(options);
  const res = createResponse();
  await handler(req, res);
  return res;
};

const configureTestAdmin = () => {
  process.env.ADMIN_PASSWORD = "test-only-admin-password";
  process.env.AUTH_SECRET = "test-only-auth-secret-with-at-least-thirty-two-characters";
};

const adminRequestHeaders = () => {
  const auth = requireProject("lib/auth-shared.js");
  const token = auth.createSessionValue();
  return {
    cookie: `${auth.cookieName}=${encodeURIComponent(token)}`,
    host: "example.test",
    origin: "https://example.test",
    "x-forwarded-host": "example.test",
    "x-forwarded-proto": "https",
  };
};

module.exports = {
  adminRequestHeaders,
  clearProjectModules,
  configureTestAdmin,
  createRequest,
  createResponse,
  getUnexpectedExternalFetchCount,
  invoke,
  projectRoot,
  requireProject,
  resetSecurityEnv,
};
