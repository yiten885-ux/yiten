(() => {
  const checkoutEndpoint = "/api/payments/create-checkout-session";
  const fulfillCheckoutEndpoint = "/api/payments/fulfill-checkout";
  const paypalConfigEndpoint = "/api/paypal/client-config";
  const paypalCreateOrderEndpoint = "/api/paypal/create-order";
  const paypalCaptureOrderEndpoint = "/api/paypal/capture-order";
  const deliveryLogsKey = "yiten-delivery-logs";
  const catalog = {
    membership: {
      monthly: { title: "月度会员", amount: "12.00", currency: "USD", cycle: "/ 月" },
      quarterly: { title: "季度会员", amount: "29.00", currency: "USD", cycle: "/ 季" },
      yearly: { title: "年度会员", amount: "99.00", currency: "USD", cycle: "/ 年" },
    },
    ebook: {
      visitor: { title: "电子书：《只富一次》三部曲单本", amount: "29.00", currency: "USD" },
      member: { title: "电子书：《只富一次》三部曲单本（会员价）", amount: "19.00", currency: "USD" },
      book1: { title: "《只富一次：普通人的财富守恒法则》", amount: "29.00", currency: "USD" },
      book2: { title: "《守住财富：消费陷阱与资产配置》", amount: "29.00", currency: "USD" },
      book3: { title: "《永不返贫：家庭防坠落系统》", amount: "29.00", currency: "USD" },
      bundle: { title: "《只富一次》三部曲套装与工具包", amount: "59.00", currency: "USD" },
      "member-bundle": { title: "《只富一次》三部曲套装与工具包（会员价）", amount: "39.00", currency: "USD" },
      extra1: { title: "补充资料包 1", amount: "29.00", currency: "USD" },
      extra2: { title: "补充资料包 2", amount: "29.00", currency: "USD" },
    },
  };

  const formatCatalogAmount = (value, fallback = "29.00") => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : fallback;
  };
  const isPublishedProduct = (product) => Boolean(product && (product.status === "published" || product.status === "已发布" || product.published === true));

  const hydrateExtraProductCatalog = () => {
    try {
      const products = JSON.parse(localStorage.getItem("yiten-book-products") || "{}");
      const single = isPublishedProduct(products?.single) ? products.single : null;
      const bundle = isPublishedProduct(products?.bundle) ? products.bundle : null;
      if (single?.title) {
        const visitorAmount = formatCatalogAmount(single.visitorPrice);
        const memberAmount = formatCatalogAmount(single.memberPrice, visitorAmount);
        catalog.ebook.visitor = { title: single.title, amount: visitorAmount, currency: "USD" };
        catalog.ebook.member = { title: `${single.title}（会员价）`, amount: memberAmount, currency: "USD" };
        catalog.ebook.book1 = { title: single.title, amount: visitorAmount, currency: "USD" };
      }
      if (bundle?.title) {
        const visitorAmount = formatCatalogAmount(bundle.visitorPrice, "59.00");
        const memberAmount = formatCatalogAmount(bundle.memberPrice, "39.00");
        catalog.ebook.bundle = { title: bundle.title, amount: visitorAmount, currency: "USD" };
        catalog.ebook["member-bundle"] = { title: `${bundle.title}（会员价）`, amount: memberAmount, currency: "USD" };
      }
      ["extra1", "extra2"].forEach((slot) => {
        const product = products?.[slot];
        if (!isPublishedProduct(product) || !product.title) return;
        catalog.ebook[slot] = {
          title: product.title,
          amount: formatCatalogAmount(product.visitorPrice),
          currency: "USD",
        };
      });
      if (Array.isArray(products?.extraProducts)) {
        products.extraProducts.forEach((product, index) => {
          if (!isPublishedProduct(product) || !product.title) return;
          catalog.ebook[`extra-dynamic-${index + 1}`] = {
            title: product.title,
            amount: formatCatalogAmount(product.visitorPrice),
            currency: "USD",
          };
        });
      }
    } catch (_error) {
      // Keep static fallback catalog when local product data is unavailable.
    }
  };
  hydrateExtraProductCatalog();
  const providerCopy = {
    paypal: "PayPal 官方收银台，适合海外用户和 PayPal 账户。",
    card: "银行卡/信用卡安全支付。",
    wechat: "微信支付。",
    alipay: "支付宝支付。",
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
  const selectedPlanPrice = document.querySelector("#selectedPlanPrice");
  const selectedPlanCycle = document.querySelector("#selectedPlanCycle");

  if (!offlinePayment || !offlinePaymentText || !offlinePaymentLink || !paymentStatus || !paypalButtons) return;

  const getSelectedItem = () => catalog[selectedCheckout.type]?.[selectedCheckout.id];

  const getPayload = () => {
    const item = getSelectedItem();
    if (selectedCheckout.type === "ebook") {
      return {
        product: "ebook",
        audience: selectedCheckout.id,
        method: selectedMethod,
        item: item
          ? { title: item.title, amount: item.amount, currency: item.currency || "USD" }
          : null,
      };
    }
    return { plan: selectedCheckout.id, method: selectedMethod };
  };

  const setMessage = (message) => {
    paymentStatus.textContent = message;
  };

  const readDeliveryLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem(deliveryLogsKey) || "[]");
      return Array.isArray(logs) ? logs : [];
    } catch (_error) {
      return [];
    }
  };

  const recordDelivery = (delivery) => {
    if (!delivery?.orderId) return;
    const logs = readDeliveryLogs().filter((item) => item.orderId !== delivery.orderId);
    logs.unshift({
      orderId: delivery.orderId,
      provider: delivery.provider || "",
      itemTitle: delivery.itemTitle || getSelectedItem()?.title || "",
      deliveryEmailId: delivery.deliveryEmailId || "",
      to: delivery.to || "",
      deliveredAt: delivery.deliveredAt || new Date().toISOString(),
    });
    localStorage.setItem(deliveryLogsKey, JSON.stringify(logs.slice(0, 50)));
  };

  const fulfillStripeCheckout = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("payment") !== "success" || !sessionId) return;
    const markerKey = `yiten-delivered-session-${sessionId}`;
    if (localStorage.getItem(markerKey)) {
      setMessage("支付成功。交付邮件此前已发送，如未收到请检查垃圾邮件或联系我。");
      return;
    }
    setMessage("支付成功，正在发送交付邮件...");
    try {
      const response = await fetch(`${fulfillCheckoutEndpoint}?session_id=${encodeURIComponent(sessionId)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "交付邮件发送失败");
      localStorage.setItem(markerKey, "yes");
      recordDelivery(result);
      setMessage(`支付成功，交付邮件已发送到 ${result.to || "你的邮箱"}。`);
    } catch (error) {
      setMessage(`${error.message}。付款已完成，请联系我手动补发资料。`);
    }
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
            body: JSON.stringify({ orderId: data.orderID, ...getPayload() }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "PayPal 收款确认失败");
          recordDelivery(result);
          setMessage(result.emailSent
            ? `PayPal 支付完成，交付邮件已发送到 ${result.to || "你的 PayPal 邮箱"}。`
            : `PayPal 支付完成：${result.status || "COMPLETED"}`);
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
    if (selectedPlanPrice) selectedPlanPrice.textContent = `$${Number(item.amount).toFixed(Number(item.amount) % 1 ? 2 : 0)}`;
    if (selectedPlanCycle) selectedPlanCycle.textContent = item.cycle || "";
    if (selectedPlanSummary) {
      selectedPlanSummary.textContent = selectedCheckout.type === "ebook"
        ? "一次性购买电子书或套装。会员可使用专属折扣价。"
        : "选择会员方案和支付方式后，即可进入安全收银台完成订阅。";
    }
    offlinePaymentText.textContent = `你正在购买：${item.title}，金额 ${item.currency} ${item.amount}。支付方式：${providerCopy[selectedMethod]}`;

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
      setMessage("点击按钮后将进入安全收银台。");
    } else {
      setMessage("如果当前支付方式暂不可用，请先选择 PayPal 或银行卡。");
    }
  };

  const createStripeCheckout = async () => {
    const item = getSelectedItem();
    setMessage(`正在打开 ${item?.title || "商品"} 的安全支付页...`);
    const response = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getPayload()),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "创建支付会话失败");
    if (!result.url) throw new Error("支付平台没有返回收银台地址");
    window.location.href = result.url;
  };

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCheckout = { type: "membership", id: button.dataset.plan || "yearly" };
      document.querySelectorAll(".plan-button").forEach((item) => item.classList.toggle("active", item === button));
      resetPayPal();
      syncCheckoutCopy();
      document.querySelector("#checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".ebook-button");
    if (!button) return;
    hydrateExtraProductCatalog();
    const audience = button.dataset.audience || "visitor";
    selectedCheckout = { type: "ebook", id: catalog.ebook[audience] ? audience : "visitor" };
    selectedMethod = button.dataset.method || (selectedMethod === "paypal" ? "card" : selectedMethod);
    document.querySelectorAll(".payment-method").forEach((item) => {
      item.classList.toggle("active", item.dataset.method === selectedMethod);
    });
    resetPayPal();
    syncCheckoutCopy();
    try {
      button.disabled = true;
      button.dataset.loading = "true";
      await createStripeCheckout();
    } catch (error) {
      const item = getSelectedItem();
      const label = methodLabels[selectedMethod] || selectedMethod;
      setMessage(`${error.message}。${item?.title || "该商品"} 的 ${label} 暂时不可用，请稍后重试或改用 PayPal。`);
      document.querySelector("#checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
      button.disabled = false;
      delete button.dataset.loading;
    }
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

    try {
      await createStripeCheckout();
    } catch (error) {
      const label = methodLabels[selectedMethod] || selectedMethod;
      setMessage(`${error.message}。请更换 PayPal 或银行卡后重试。`);
      offlinePaymentText.textContent = `${item?.title || "该商品"} 的 ${label}暂时不可用。`;
    }
  });

  syncCheckoutCopy();
  fulfillStripeCheckout();

  window.addEventListener("storage", (event) => {
    if (event.key !== "yiten-book-products" && event.key !== "yiten-book-products-updated-at") return;
    hydrateExtraProductCatalog();
    syncCheckoutCopy();
  });
})();
