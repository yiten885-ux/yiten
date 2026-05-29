(() => {
  const checkoutEndpoint = "/api/payments/create-checkout-session";
  const planAmounts = {
    monthly: { title: "月度会员", amount: "12.00", currency: "USD" },
    yearly: { title: "年度会员", amount: "99.00", currency: "USD" },
  };
  const providerCopy = {
    wechat: "微信支付将通过跨境支付平台创建支付会话。推荐先接 Stripe Checkout 的 WeChat Pay；如果 Stripe 不支持你的账户地区，再切换连连支付或 PingPong。",
    alipay: "支付宝将通过跨境支付平台创建支付会话。推荐先接 Stripe Checkout 的 Alipay；如果 Stripe 不支持你的账户地区，再切换连连支付或 PingPong。",
  };

  let selectedPlan = "yearly";
  let selectedMethod = "paypal";

  const offlinePayment = document.querySelector("#offlinePayment");
  const offlinePaymentText = document.querySelector("#offlinePaymentText");
  const offlinePaymentLink = document.querySelector("#offlinePaymentLink");
  const paymentStatus = document.querySelector("#paymentStatus");

  if (!offlinePayment || !offlinePaymentText || !offlinePaymentLink || !paymentStatus) return;

  const setMessage = (message) => {
    paymentStatus.textContent = message;
  };

  const syncOfflineCopy = () => {
    if (selectedMethod === "paypal") return;
    const plan = planAmounts[selectedPlan];
    offlinePayment.hidden = false;
    offlinePaymentText.textContent = `${providerCopy[selectedMethod]} 当前方案：${plan.title} ${plan.currency} ${plan.amount}。`;
    offlinePaymentLink.href = "#";
    offlinePaymentLink.classList.remove("disabled");
    offlinePaymentLink.textContent = selectedMethod === "wechat" ? "创建微信支付链接" : "创建支付宝支付链接";
    setMessage("后端支付网关上线并完成平台 KYC 后，这里会跳转到真实收银台。当前代码已预留 Stripe/连连/PingPong 中转入口。");
  };

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.plan || selectedPlan;
      syncOfflineCopy();
    });
  });

  document.querySelectorAll(".payment-method").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMethod = button.dataset.method || selectedMethod;
      window.setTimeout(syncOfflineCopy, 0);
    });
  });

  offlinePaymentLink.addEventListener("click", async (event) => {
    if (selectedMethod === "paypal") return;
    event.preventDefault();
    const plan = planAmounts[selectedPlan];
    setMessage("正在创建跨境支付会话...");

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
      setMessage(
        `${error.message}。需要先部署后端 API，并在 Stripe、连连或 PingPong 完成收款账户审核，才能真正完成付款、收款、到账。`
      );
      offlinePaymentText.textContent = `${plan.title} 的 ${selectedMethod === "wechat" ? "微信" : "支付宝"}跨境收款通道已在代码中预留，等待支付平台账号开通。`;
    }
  });
})();
