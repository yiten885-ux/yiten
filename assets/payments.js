(() => {
  const checkoutEndpoint = "/api/payments/create-checkout-session";
  const paypalConfigEndpoint = "/api/paypal/client-config";
  const paypalCreateOrderEndpoint = "/api/paypal/create-order";
  const paypalCaptureOrderEndpoint = "/api/paypal/capture-order";
  const planAmounts = {
    monthly: { title: "月度会员", amount: "12.00", currency: "USD" },
    yearly: { title: "年度会员", amount: "99.00", currency: "USD" },
  };
  const providerCopy = {
    paypal: "PayPal 将通过 PayPal 官方收银台收款。适合海外用户和已有 PayPal 账户的用户。",
    card: "银行卡/信用卡将通过 Stripe Checkout 收款。这是当前可以先跑通支付闭环的正式通道。",
    wechat: "微信支付将通过 Stripe Checkout 创建支付会话；当前 Stripe 后台显示待批准，批准后即可使用。",
    alipay: "支付宝将通过 Stripe Checkout 创建支付会话；当前 Stripe 后台显示待批准，批准后即可使用。",
  };
  const methodLabels = {
    paypal: "PayPal",
    card: "银行卡支付",
    wechat: "微信支付",
    alipay: "支付宝支付",
  };

  let selectedPlan = "yearly";
  let selectedMethod = "card";
  let paypalReady = false;

  const paypalButtons = document.querySelector("#paypalButtons");
  const offlinePayment = document.querySelector("#offlinePayment");
  const offlinePaymentText = document.querySelector("#offlinePaymentText");
  const offlinePaymentLink = document.querySelector("#offlinePaymentLink");
  const paymentStatus = document.querySelector("#paymentStatus");

  if (!offlinePayment || !offlinePaymentText || !offlinePaymentLink || !paymentStatus || !paypalButtons) return;

  const setMessage = (message) => {
    paymentStatus.textContent = message;
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const renderPayPalButtons = async () => {
    if (paypalReady || !window.paypal) return;
    paypalReady = true;
    paypalButtons.innerHTML = "";
    window.paypal
      .Buttons({
        style: { layout: "vertical", shape: "rect", label: "paypal" },
        createOrder: async () => {
          setMessage("正在创建 PayPal 订单...");
          const response = await fetch(paypalCreateOrderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: selectedPlan }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "创建 PayPal 订单失败");
          return result.id;
        },
        onApprove: async (data) => {
          setMessage("PayPal 已授权，正在确认收款...");
          const response = await fetch(paypalCaptureOrderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "PayPal 收款确认失败");
          setMessage(`PayPal 支付完成：${result.status || "COMPLETED"}`);
        },
        onCancel: () => setMessage("PayPal 支付已取消。"),
        onError: (error) => setMessage(error.message || "PayPal 支付失败。"),
      })
      .render("#paypalButtons");
  };

  const setupPayPal = async () => {
    try {
      const response = await fetch(paypalConfigEndpoint);
      const config = await response.json();
      if (!response.ok) throw new Error(config.message || "PayPal 尚未配置");
      await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=${encodeURIComponent(config.currency || "USD")}&intent=capture`);
      await renderPayPalButtons();
    } catch (error) {
      setMessage(`${error.message}。PayPal 暂时不可用，可以先使用银行卡。`);
    }
  };

  const syncCheckoutCopy = () => {
    const plan = planAmounts[selectedPlan];
    offlinePaymentText.textContent = `${providerCopy[selectedMethod]} 当前方案：${plan.title} ${plan.currency} ${plan.amount}。`;

    if (selectedMethod === "paypal") {
      offlinePayment.hidden = true;
      paypalButtons.hidden = false;
      setMessage("正在加载 PayPal 官方按钮...");
      setupPayPal();
      return;
    }

    paypalButtons.hidden = true;
    offlinePayment.hidden = false;
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
      if (paypalReady && window.paypal) {
        paypalReady = false;
        paypalButtons.innerHTML = "";
      }
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
