// lib/rate-limit.js — 共享限流器(固定窗口计数)
//
// 覆盖面:登录、上传、公开 catalog、浏览计数、喜马拉雅签名。
// 后端:默认进程内存(单实例/测试/Preview 单实例有效)。
// 生产多实例:建议接入 Vercel KV(原子 INCR + 过期),把 MemoryBackend 换成
// KVBackend 即可,调用方签名不变。多实例下内存后端只能按实例计数,不构成
// 全局硬限制——文档需明确该边界,并在上线前评估 KV 后端。

const MemoryBackend = () => {
  const buckets = new Map();
  const prune = () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };
  return {
    async increment(key, windowMs) {
      prune();
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const bucket = { count: 1, resetAt: now + windowMs };
        buckets.set(key, bucket);
        return { count: 1, resetAt: bucket.resetAt };
      }
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    },
  };
};

const createRateLimiter = ({ windowMs = 60_000, max = 60, backend = MemoryBackend() } = {}) => {
  return async (key) => {
    const { count, resetAt } = await backend.increment(key, windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return count > max ? { allowed: false, retryAfterSeconds } : { allowed: true, retryAfterSeconds: 0 };
  };
};

// Vercel 平台会覆盖 X-Forwarded-For,生产可靠;同源校验仍在前置执行。
const clientIp = (req) => {
  const forwarded = req.headers && req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  const realIp = req.headers && req.headers["x-real-ip"];
  if (realIp) return String(realIp).trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
};

const rateLimited = (res, retryAfterSeconds) => {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    ok: false,
    code: "rate_limited",
    message: "请求过于频繁,请稍后再试。",
    retryAfterSeconds,
  });
};

// 预置限流器(每 IP 每分钟配额)
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10 }); // 登录尝试
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 上传
const catalogLimiter = createRateLimiter({ windowMs: 60_000, max: 60 }); // 公开 catalog
const viewLimiter = createRateLimiter({ windowMs: 60_000, max: 120 }); // 浏览计数
const signLimiter = createRateLimiter({ windowMs: 60_000, max: 30 }); // 签名
const wechatLimiter = createRateLimiter({ windowMs: 60_000, max: 30 }); // 微信回调验证

module.exports = {
  catalogLimiter,
  clientIp,
  createRateLimiter,
  loginLimiter,
  MemoryBackend,
  rateLimited,
  signLimiter,
  uploadLimiter,
  viewLimiter,
  wechatLimiter,
};
