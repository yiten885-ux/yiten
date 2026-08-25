const { setNoStore } = require("./auth-shared");
const validate = require("../assets/validate.js");

const createDisabledPaymentHandler = (allowedMethod) => function disabledPaymentHandler(req, res) {
  setNoStore(res);
  if (req.method !== allowedMethod) {
    res.setHeader("Allow", allowedMethod);
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }
  res.status(503).json(validate.apiError("payments_disabled_security_review", "支付与自动交付正在进行安全升级，当前不会创建或扣款。", 503));
};

module.exports = { createDisabledPaymentHandler };
