const defaultWorks = [
  {
    title: "为什么个人网站仍然重要",
    type: "essay",
    summary:
      "当平台不断变化，个人网站是你的思想、作品和关系的长期资产。它不是简历，而是一块可以持续复利的土地。",
    url: "https://example.com/essay",
  },
  {
    title: "独立创作者工具箱",
    type: "project",
    summary:
      "整理写作、发布、收款、邮件列表和数据分析工具，帮助一个人搭起从创作到分发的最小系统。",
    url: "https://example.com/project",
  },
  {
    title: "关于注意力的十二条札记",
    type: "note",
    summary:
      "一些短句和观察：如何减少信息噪音，如何把灵感收集成主题，如何让阅读真正改变行动。",
    url: "https://example.com/note",
  },
];

const defaultEpisodes = [
  {
    title: "一个人如何建立自己的内容资产",
    label: "精选试听",
    summary: "从个人网站、邮件列表、播客到付费订阅，搭出最小但完整的创作者系统。",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "18:42",
  },
  {
    title: "付费订阅不是卖内容，而是卖持续陪伴",
    label: "会员节目",
    summary: "聊聊如何让读者愿意长期付费，以及会员内容应该如何设计边界。",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "24:10",
  },
  {
    title: "从作品墙到个人商业闭环",
    label: "公开节目",
    summary: "把文章、项目、播客和收款连接起来，让个人网站成为一个真正的业务入口。",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "21:36",
  },
];

const plans = {
  monthly: {
    title: "月度会员",
    summary: "月度会员 $12/月，可访问会员文章、播客和每月更新。",
    amount: "12.00",
    currency: "USD",
  },
  yearly: {
    title: "年度会员",
    summary: "年度会员 $99/年，可访问完整会员内容和闭门笔记。",
    amount: "99.00",
    currency: "USD",
  },
};

const paymentConfig = {
  paypalClientId:
    "AfOcsZ60jzBLe4OL3qboZu9L5_9EjaR4tHnPtRJ4OQvlkRdgVlasL2OMMy5bbxvXMBmcp1nZ55dnTzoO",
  paypalEnvironment: "sandbox",
  paypalMode: "client",
  createOrderEndpoint: "/api/paypal/create-order",
  captureOrderEndpoint: "/api/paypal/capture-order",
  wechatPayUrl: "",
  alipayUrl: "",
};

const labels = {
  essay: "文章",
  project: "项目",
  note: "札记",
  audio: "音频",
};

const workGrid = document.querySelector("#workGrid");
const filterButtons = document.querySelectorAll(".filter");
const workForm = document.querySelector("#workForm");
const subscribeForm = document.querySelector("#subscribeForm");
const subscribeMessage = document.querySelector("#subscribeMessage");
const resetDemo = document.querySelector("#resetDemo");
const year = document.querySelector("#year");
const episodeList = document.querySelector("#episodeList");
const episodePlayer = document.querySelector("#episodePlayer");
const episodeLabel = document.querySelector("#episodeLabel");
const episodeTitle = document.querySelector("#episodeTitle");
const episodeSummary = document.querySelector("#episodeSummary");
const planButtons = document.querySelectorAll(".plan-button");
const paymentMethods = document.querySelectorAll(".payment-method");
const selectedPlanTitle = document.querySelector("#selectedPlanTitle");
const selectedPlanSummary = document.querySelector("#selectedPlanSummary");
const paypalButtons = document.querySelector("#paypalButtons");
const offlinePayment = document.querySelector("#offlinePayment");
const offlinePaymentText = document.querySelector("#offlinePaymentText");
const offlinePaymentLink = document.querySelector("#offlinePaymentLink");
const paymentStatus = document.querySelector("#paymentStatus");

let activeFilter = "all";
let selectedPlan = "yearly";
let selectedMethod = "paypal";

const readWorks = () => JSON.parse(localStorage.getItem("personal-site-works") || "null") || defaultWorks;
const saveWorks = (works) => localStorage.setItem("personal-site-works", JSON.stringify(works));
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])
  );
const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#096;");

const renderWorks = () => {
  const works = readWorks();
  const visibleWorks = activeFilter === "all" ? works : works.filter((work) => work.type === activeFilter);
  workGrid.innerHTML = visibleWorks
    .map(
      (work) => `
        <article class="work-card">
          <div>
            <span class="work-type">${labels[work.type] || "作品"}</span>
            <h3>${escapeHtml(work.title)}</h3>
            <p>${escapeHtml(work.summary)}</p>
          </div>
          <a class="work-link" href="${escapeAttribute(work.url)}" target="_blank" rel="noreferrer">
            阅读 / 查看
          </a>
        </article>`
    )
    .join("");
};

const setEpisode = (episode, index) => {
  episodeLabel.textContent = episode.label;
  episodeTitle.textContent = episode.title;
  episodeSummary.textContent = episode.summary;
  episodePlayer.src = episode.audioUrl;
  episodePlayer.load();
  document.querySelectorAll(".episode-button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.index) === index);
  });
};

const renderEpisodes = () => {
  episodeList.innerHTML = defaultEpisodes
    .map(
      (episode, index) => `
        <button class="episode-button${index === 0 ? " active" : ""}" data-index="${index}" type="button">
          <span>${escapeHtml(episode.label)}</span>
          <strong>${escapeHtml(episode.title)}</strong>
          <small>${escapeHtml(episode.duration)}</small>
        </button>`
    )
    .join("");

  document.querySelectorAll(".episode-button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      setEpisode(defaultEpisodes[index], index);
    });
  });
};

const hasRealPaypalClient = () =>
  paymentConfig.paypalClientId && !paymentConfig.paypalClientId.startsWith("REPLACE_");

const loadPaypalSdk = () =>
  new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const host = paymentConfig.paypalEnvironment === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
    const script = document.createElement("script");
    script.src = `${host}/sdk/js?client-id=${encodeURIComponent(paymentConfig.paypalClientId)}&currency=USD&intent=capture`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

const renderPaypal = async () => {
  paypalButtons.innerHTML = "";
  if (!hasRealPaypalClient()) {
    paymentStatus.textContent = "PayPal Client ID 和后端订单接口配置完成后，这里会显示正式 PayPal 支付按钮。";
    return;
  }

  paymentStatus.textContent = "正在加载 PayPal Sandbox...";
  try {
    await loadPaypalSdk();
    window.paypal
      .Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "subscribe" },
        createOrder: async (_data, actions) => {
          const plan = plans[selectedPlan];
          if (paymentConfig.paypalMode === "client") {
            return actions.order.create({
              intent: "CAPTURE",
              purchase_units: [
                {
                  description: plan.title,
                  amount: { currency_code: plan.currency, value: plan.amount },
                },
              ],
            });
          }

          const response = await fetch(paymentConfig.createOrderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: selectedPlan }),
          });
          const order = await response.json();
          if (!response.ok) throw new Error(order.message || "创建订单失败");
          return order.id;
        },
        onApprove: async (data, actions) => {
          if (paymentConfig.paypalMode === "client") {
            const result = await actions.order.capture();
            paymentStatus.textContent = `Sandbox 付款成功，订单号：${result.id}`;
            return;
          }

          const response = await fetch(paymentConfig.captureOrderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID, plan: selectedPlan }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "收款确认失败");
          paymentStatus.textContent = "付款成功，会员权限已开通。";
        },
        onError: (error) => {
          paymentStatus.textContent = error.message || "PayPal 支付失败，请稍后再试。";
        },
      })
      .render("#paypalButtons");
    paymentStatus.textContent = "";
  } catch (error) {
    paymentStatus.textContent = error.message || "PayPal 加载失败。";
  }
};

const updateCheckout = () => {
  const plan = plans[selectedPlan];
  selectedPlanTitle.textContent = plan.title;
  selectedPlanSummary.textContent = `${plan.summary} 当前应付 ${plan.currency} ${plan.amount}。`;

  paypalButtons.hidden = selectedMethod !== "paypal";
  offlinePayment.hidden = selectedMethod === "paypal";

  if (selectedMethod === "paypal") {
    renderPaypal();
    return;
  }

  const isWechat = selectedMethod === "wechat";
  const payUrl = isWechat ? paymentConfig.wechatPayUrl : paymentConfig.alipayUrl;
  offlinePaymentText.textContent = isWechat
    ? "微信支付需要配置微信商户号、支付场景和回调地址。配置完成后，这里会跳转到微信付款。"
    : "支付宝需要配置应用 ID、商户私钥、公钥证书和回调地址。配置完成后，这里会跳转到支付宝付款。";
  offlinePaymentLink.href = payUrl || "#";
  offlinePaymentLink.classList.toggle("disabled", !payUrl);
  paymentStatus.textContent = payUrl ? "" : "该支付方式还未配置正式商户参数。";
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderWorks();
  });
});

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPlan = button.dataset.plan;
    planButtons.forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector("#membership").scrollIntoView({ behavior: "smooth", block: "start" });
    updateCheckout();
  });
});

paymentMethods.forEach((button) => {
  button.addEventListener("click", () => {
    selectedMethod = button.dataset.method;
    paymentMethods.forEach((item) => item.classList.toggle("active", item === button));
    updateCheckout();
  });
});

workForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(workForm);
  const work = {
    title: formData.get("title").trim(),
    type: formData.get("type"),
    url: formData.get("url").trim(),
    summary: formData.get("summary").trim(),
  };

  saveWorks([work, ...readWorks()]);
  workForm.reset();
  activeFilter = "all";
  filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  renderWorks();
  document.querySelector("#works").scrollIntoView({ behavior: "smooth" });
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(subscribeForm).get("email").trim().toLowerCase();
  const subscribers = JSON.parse(localStorage.getItem("personal-site-subscribers") || "[]");
  if (!subscribers.includes(email)) {
    subscribers.push(email);
    localStorage.setItem("personal-site-subscribers", JSON.stringify(subscribers));
  }
  subscribeMessage.textContent = "已订阅。正式上线后这里会接入邮件服务。";
  subscribeForm.reset();
});

resetDemo.addEventListener("click", () => {
  localStorage.removeItem("personal-site-works");
  activeFilter = "all";
  filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  renderWorks();
});

year.textContent = new Date().getFullYear();
renderWorks();
renderEpisodes();
updateCheckout();
