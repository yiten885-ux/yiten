(() => {
  const checkoutEndpoint = "/api/payments/create-checkout-session";
  const planAmounts = {
    monthly: { title: "月度会员", amount: "12.00", currency: "USD" },
    yearly: { title: "年度会员", amount: "99.00", currency: "USD" },
  };
  const providerCopy = {
    card: "银行卡/信用卡将通过 Stripe Checkout 收款。这是当前可以先跑通支付闭环的正式通道。",
    wechat: "微信支付将通过 Stripe Checkout 创建支付会话；当前 Stripe 后台显示待批准，批准后即可使用。",
    alipay: "支付宝将通过 Stripe Checkout 创建支付会话；当前 Stripe 后台显示待批准，批准后即可使用。",
  };
  const methodLabels = {
    card: "银行卡支付",
    wechat: "微信支付",
    alipay: "支付宝支付",
  };

  let selectedPlan = "yearly";
  let selectedMethod = "card";

  const offlinePayment = document.querySelector("#offlinePayment");
  const offlinePaymentText = document.querySelector("#offlinePaymentText");
  const offlinePaymentLink = document.querySelector("#offlinePaymentLink");
  const paymentStatus = document.querySelector("#paymentStatus");

  if (!offlinePayment || !offlinePaymentText || !offlinePaymentLink || !paymentStatus) return;

  const setMessage = (message) => {
    paymentStatus.textContent = message;
  };

  const syncCheckoutCopy = () => {
    const plan = planAmounts[selectedPlan];
    offlinePayment.hidden = false;
    offlinePaymentText.textContent = `${providerCopy[selectedMethod]} 当前方案：${plan.title} ${plan.currency} ${plan.amount}。`;
    offlinePaymentLink.href = "#";
    offlinePaymentLink.classList.remove("disabled");
    offlinePaymentLink.textContent = `创建${methodLabels[selectedMethod]}链接`;
    if (selectedMethod === "card") {
      setMessage("银行卡通道已接入 Stripe，可用于真实测试支付；到账到银行仍取决于 Stripe 提现状态。");
    } else {
      setMessage("微信/支付宝已在代码中接入，等待 Stripe 支付方式审批通过后才能真实付款。");
    }
  };

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.plan || selectedPlan;
      syncCheckoutCopy();
    });
  });

  document.querySelectorAll(".payment-method").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMethod = button.dataset.method || selectedMethod;
      window.setTimeout(syncCheckoutCopy, 0);
    });
  });

  offlinePaymentLink.addEventListener("click", async (event) => {
    event.preventDefault();
    const plan = planAmounts[selectedPlan];
    setMessage("正在创建 Stripe 支付会话...");

    try {
      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, method: selectedMethod }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "创建支付会话失败");
      if (!result.url) throw new Error("支付平台没有返回收银台地址");
      window.location.href = result.url;
    } catch (error) {
      const label = methodLabels[selectedMethod] || selectedMethod;
      setMessage(`${error.message}。如果是微信/支付宝，这是 Stripe 仍在审批该支付方式；银行卡请检查 Stripe 密钥和账户状态。`);
      offlinePaymentText.textContent = `${plan.title} 的 ${label}通道暂时没有返回可用收银台。`;
    }
  });

  syncCheckoutCopy();
})();
