const { createDisabledPaymentHandler } = require("../../lib/payment-disabled");

// Fulfillment used to be a replayable GET side effect. It remains disabled
// until a webhook-driven, idempotent order store is implemented.
module.exports = createDisabledPaymentHandler("POST");
