(() => {
  const checkoutEndpoint = "/api/payments/create-checkout-session";
  const paypalConfigEndpoint = "/api/paypal/client-config";
  const paypalCreateOrderEndpoint = "/api/paypal/create-order";
  const paypalCaptureOrderEndpoint = "/api/paypal/capture-order";
  const catalog = {
    membership: {
      monthly: { title: "月度会员", amount: "12.00", currency: "USD" },
      yearly: { title: "年度会员", amount: "99.00", currency: "USD" },
    },
    ebook: {
      visitor: { title: "电子书：长期思考与个人系统", amount: "29.00", currency: "USD" },
      member: { title: "电子书：长期思考与个人系统（会员价）", amount: "19.00", currency: "USD" },
    },
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

  let selectedCheckout = { type: "membership", id: "yearly" };
  let selectedMethod = "card";
  let paypalReady = false;

  const paypalButtons = document.querySelector("#paypalButtons");
  const offlinePayment = document.querySelector("#offlinePayment");
  const offlinePaymentText = document.querySelector("#offlinePaymentText");
  const offlinePaymentLink = document.querySelector("#offlinePaymentLink");
  const paymentStatus = document.querySelector("#paymentStatus");
  const selectedPlanTitle = document.querySelector("#selectedPlanTitle");
  const selectedPlanSummary = document.querySelector("#selectedPlanSummary");

  if (!offlinePayment || !offlinePaymentText || !offlinePaymentLink || !paymentStatus || !paypalButtons) return;

  const getSelectedItem = () => catalog[selectedCheckout.type]?.[selectedCheckout.id];

  const getPayload = () => {
    if (selectedCheckout.type === "ebook") {
      return { product: "ebook", audience: selectedCheckout.id, method: selectedMethod };
    }
    return { plan: selectedCheckout.id, method: selectedMethod };
  };

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

  const resetPayPal = () => {
    if (paypalReady && window.paypal) {
      paypalReady = false;
      paypalButtons.innerHTML = "";
    }
  };

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
            body: JSON.stringify(getPayload()),
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
    const item = getSelectedItem();
    if (!item) return;
    if (selectedPlanTitle) selectedPlanTitle.textContent = item.title;
    if (selectedPlanSummary) {
      selectedPlanSummary.textContent = selectedCheckout.type === "ebook"
        ? "这是一次性电子书购买，游客可原价购买，订阅会员可用会员价购买。"
        : "选择方案后，可以用 PayPal 或银行卡/信用卡完成真实支付测试；微信/支付宝审批通过后会自动走同一套 Stripe Checkout。";
    }
    offlinePaymentText.textContent = `${providerCopy[selectedMethod]} 当前商品：${item.title} ${item.currency} ${item.amount}。`;

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
      setMessage("银行卡通道已接入 Stripe，可用于真实测试支付；到账到银行仍取决于 Stripe 提现状态。电子书交付页下一步接入。 ");
    } else {
      setMessage("微信/支付宝已在代码中接入，等待 Stripe 支付方式审批通过后才能真实付款。 ");
    }
  };

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCheckout = { type: "membership", id: button.dataset.plan || "yearly" };
      resetPayPal();
      syncCheckoutCopy();
      document.querySelector("#membership")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll(".ebook-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCheckout = { type: "ebook", id: button.dataset.audience === "member" ? "member" : "visitor" };
      resetPayPal();
      syncCheckoutCopy();
      document.querySelector("#membership")?.scrollIntoView({ behavior: "smooth" });
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
    const item = getSelectedItem();
    setMessage("正在创建 Stripe 支付会话...");

    try {
      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "创建支付会话失败");
      if (!result.url) throw new Error("支付平台没有返回收银台地址");
      window.location.href = result.url;
    } catch (error) {
      const label = methodLabels[selectedMethod] || selectedMethod;
      setMessage(`${error.message}。如果是微信/支付宝，这是 Stripe 仍在审批该支付方式；银行卡请检查 Stripe 密钥和账户状态。`);
      offlinePaymentText.textContent = `${item?.title || "当前商品"} 的 ${label}通道暂时没有返回可用收银台。`;
    }
  });

  syncCheckoutCopy();
})();
