const { setNoStore } = require("./auth-shared");

const createDisabledPaymentHandler = (allowedMethod) => function disabledPaymentHandler(req, res) {
  setNoStore(res);
  if (req.method !== allowedMethod) {
    res.setHeader("Allow", allowedMethod);
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }
  res.status(503).json({
    ok: false,
    code: "payments_disabled_security_review",
    message: "支付与自动交付正在进行安全升级，当前不会创建或扣款。",
  });
};

module.exports = { createDisabledPaymentHandler };
