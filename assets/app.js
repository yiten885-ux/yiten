const defaultWorks = [
  {
    title: "为什么个人网站仍然重要",
    type: "essay",
    summary:
      "当平台不断变化，个人网站是你的思想、作品和关系的长期资产。它不是简历，而是一块可以持续复利的土地。",
    url: "https://example.com/essay",
    access: "metered",
    freePercent: 35,
  },
  {
    title: "独立创作者工具箱",
    type: "project",
    summary:
      "整理写作、发布、收款、邮件列表和数据分析工具，帮助一个人搭起从创作到分发的最小系统。",
    url: "https://example.com/project",
    access: "free",
    freePercent: 100,
  },
  {
    title: "关于注意力的十二条札记",
    type: "note",
    summary:
      "一些短句和观察：如何减少信息噪音，如何把灵感收集成主题，如何让阅读真正改变行动。",
    url: "https://example.com/note",
    access: "member",
    freePercent: 20,
  },
];

const labels = {
  essay: "文章",
  project: "项目",
  note: "札记",
  audio: "音频",
};

const accessLabels = {
  free: "免费公开",
  metered: "部分免费",
  member: "订阅解锁",
};

const platformDestinations = {
  substack: "https://substack.com/home",
  youtube: "https://studio.youtube.com/",
  xiaohongshu: "https://creator.xiaohongshu.com/",
  tiktok: "https://www.tiktok.com/upload",
};

const injectResponsiveStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .work-meta-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px}.work-meta-row .work-type{margin-bottom:0}.access-pill{display:inline-flex;border:1px solid rgba(31,94,77,.24);border-radius:999px;padding:4px 10px;background:#fffdf7;color:var(--accent);font-size:12px;font-weight:700}.preview-meter{height:7px;overflow:hidden;border-radius:999px;background:#e9e1d5}.preview-meter span{display:block;width:var(--free-percent);height:100%;border-radius:inherit;background:var(--accent)}.preview-copy{display:block;margin-top:8px;color:var(--muted);font-weight:700}.work-card.gated{background:linear-gradient(180deg,#fffdf7 0%,#fbf7ef 100%)}.subscribe-link{width:fit-content;border-bottom:1px solid rgba(31,94,77,.36)}.access-controls{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.55fr);gap:14px}.share-actions button[data-share=wechat]{border-color:rgba(31,94,77,.42);background:#eff7f1;color:var(--accent);font-weight:800}.ximalaya-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.ximalaya-catalog{display:grid;gap:12px;margin-top:18px}.catalog-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.catalog-head a{color:var(--accent);font-weight:700}.ximalaya-catalog iframe{width:100%;min-height:520px;border:1px solid var(--line);border-radius:8px;background:#fffdf7}@media(max-width:820px){.site-header{position:absolute;display:grid;gap:12px;background:linear-gradient(rgba(22,21,19,.64),rgba(22,21,19,0));}.nav-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;font-size:13px}.nav-links a{display:flex;min-height:34px;align-items:center;justify-content:center;border:1px solid rgba(255,253,247,.22);border-radius:999px;background:rgba(22,21,19,.18)}.hero{min-height:82vh}.hero-content{padding-top:180px}.hero-copy{font-size:16px}.band{width:min(100% - 28px,1120px);padding:58px 0}.section-head{gap:14px;margin-bottom:24px}.work-card,.plan-card,.checkout-panel,.player-panel,.episode-list{padding:18px}.share-actions{gap:6px}.share-actions button{min-height:34px;padding:0 9px}.access-controls{grid-template-columns:1fr}.ximalaya-catalog iframe{min-height:420px}}@media(max-width:520px){h1{font-size:38px}h2{font-size:28px}.nav-links{grid-template-columns:repeat(2,minmax(0,1fr))}.button{width:100%}.payment-methods,.filters{display:grid;grid-template-columns:1fr 1fr}.filter,.payment-method{width:100%}.share-actions{display:grid;grid-template-columns:1fr 1fr}.share-actions button{width:100%;border-radius:8px}.work-grid{gap:14px}.price{font-size:30px}.footer{padding:24px 18px}}`;
  document.head.appendChild(style);
};

const workGrid = document.querySelector("#workGrid");
const filterButtons = document.querySelectorAll(".filter");
const workForm = document.querySelector("#workForm");
const subscribeForm = document.querySelector("#subscribeForm");
const subscribeMessage = document.querySelector("#subscribeMessage");
const resetDemo = document.querySelector("#resetDemo");
const year = document.querySelector("#year");

let activeFilter = "all";

const readWorks = () => {
  const saved = localStorage.getItem("personal-site-works");
  return saved ? JSON.parse(saved) : defaultWorks;
};

const saveWorks = (works) => {
  localStorage.setItem("personal-site-works", JSON.stringify(works));
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#096;");

const normalizeWork = (work) => {
  const access = work.access || "metered";
  const fallbackPercent = access === "free" ? 100 : access === "member" ? 20 : 35;
  const freePercent = Number.isFinite(Number(work.freePercent))
    ? Math.max(0, Math.min(100, Number(work.freePercent)))
    : fallbackPercent;
  return { ...work, access, freePercent };
};

const enhanceWorkForm = () => {
  if (!workForm || workForm.querySelector("[name='access']")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "access-controls";
  wrapper.innerHTML = `
    <label>可见范围
      <select name="access">
        <option value="metered">部分免费，订阅解锁剩余内容</option>
        <option value="free">游客免费阅读全文/完整收听</option>
        <option value="member">会员专属，仅开放少量试看</option>
      </select>
    </label>
    <label>免费试看比例
      <input name="freePercent" type="number" min="0" max="100" value="35" />
    </label>
  `;
  const summary = workForm.querySelector("textarea[name='summary']")?.closest("label");
  if (summary) summary.insertAdjacentElement("afterend", wrapper);
};

const buildDistributionText = (work, target = "default") => {
  const normalized = normalizeWork(work);
  const lockLine = normalized.access === "free"
    ? "全文免费阅读。"
    : `可免费试看 ${normalized.freePercent}%，剩余内容订阅后解锁。`;
  const prefix = target === "wechat" ? "我在 Yiten Huang 看到一篇值得读的内容：" : "Yiten Huang 新作品：";
  return `${prefix}\n\n${normalized.title}\n\n${normalized.summary}\n\n${lockLine}\n\n阅读全文：${normalized.url}`;
};

const copyDistributionText = async (work, target) => {
  await navigator.clipboard.writeText(buildDistributionText(work, target));
};

const buildShareUrl = (platform, work) => {
  const normalized = normalizeWork(work);
  const url = encodeURIComponent(normalized.url);
  const title = encodeURIComponent(normalized.title);
  const text = encodeURIComponent(`${normalized.title} - ${normalized.summary}`);
  const shareTargets = {
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    weibo: `https://service.weibo.com/share/share.php?url=${url}&title=${text}`,
    telegram: `https://t.me/share/url?url=${url}&text=${title}`,
    email: `mailto:?subject=${title}&body=${text}%0A%0A${url}`,
  };
  return shareTargets[platform];
};

const shareWork = async (platform, work) => {
  if (platform === "native" && navigator.share) {
    const normalized = normalizeWork(work);
    await navigator.share({ title: normalized.title, text: normalized.summary, url: normalized.url });
    return "已打开系统分享";
  }

  if (platform === "copy") {
    await copyDistributionText(work);
    return "已复制分发文案";
  }

  if (platform === "wechat") {
    await copyDistributionText(work, "wechat");
    return "已复制微信文案";
  }

  if (platformDestinations[platform]) {
    await copyDistributionText(work);
    window.open(platformDestinations[platform], "_blank", "noopener,noreferrer");
    return "已复制文案并打开平台后台";
  }

  const shareUrl = buildShareUrl(platform, work);
  if (shareUrl) {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    return "已打开分享窗口";
  }
  return "该平台暂未配置";
};

const renderWorks = () => {
  const works = readWorks().map(normalizeWork);
  const visibleWorks =
    activeFilter === "all" ? works : works.filter((work) => work.type === activeFilter);

  workGrid.innerHTML = visibleWorks
    .map((work, index) => {
      const locked = work.access !== "free";
      const progressStyle = `style="--free-percent: ${work.freePercent}%"`;
      return `
        <article class="work-card${locked ? " gated" : ""}" data-index="${index}">
          <div>
            <div class="work-meta-row">
              <span class="work-type">${labels[work.type] || "作品"}</span>
              <span class="access-pill">${accessLabels[work.access] || "部分免费"}</span>
            </div>
            <h3>${escapeHtml(work.title)}</h3>
            <p>${escapeHtml(work.summary)}</p>
            <div class="preview-meter" ${progressStyle}><span></span></div>
            <small class="preview-copy">${work.access === "free" ? "游客可阅读全文 / 收听完整节目" : `游客可免费试看 ${work.freePercent}%，剩余内容订阅后解锁`}</small>
          </div>
          <div class="work-actions">
            <a class="work-link" href="${escapeAttribute(work.url)}" target="_blank" rel="noreferrer">${locked ? "免费试看" : "阅读 / 查看"}</a>
            ${locked ? `<a class="work-link subscribe-link" href="#membership">订阅解锁</a>` : ""}
            <div class="share-actions" aria-label="分发 ${escapeAttribute(work.title)}">
              <button type="button" data-share="native">分享</button>
              <button type="button" data-share="wechat">微信</button>
              <button type="button" data-share="copy">复制文案</button>
              <button type="button" data-share="substack">Substack</button>
              <button type="button" data-share="youtube">YouTube</button>
              <button type="button" data-share="xiaohongshu">小红书</button>
              <button type="button" data-share="tiktok">TikTok</button>
              <button type="button" data-share="x">X</button>
              <button type="button" data-share="linkedin">LinkedIn</button>
              <button type="button" data-share="weibo">微博</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

workGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share]");
  if (!button) return;
  const card = button.closest(".work-card");
  const works = activeFilter === "all" ? readWorks().map(normalizeWork) : readWorks().map(normalizeWork).filter((work) => work.type === activeFilter);
  const work = works[Number(card.dataset.index)];
  if (!work) return;

  const previousText = button.textContent;
  try {
    const message = await shareWork(button.dataset.share, work);
    button.textContent = message;
    window.setTimeout(() => {
      button.textContent = previousText;
    }, 1800);
  } catch (error) {
    console.warn("Share failed", error);
    button.textContent = "分发失败";
    window.setTimeout(() => {
      button.textContent = previousText;
    }, 1800);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderWorks();
  });
});

workForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(workForm);
  const access = formData.get("access") || "metered";
  const work = {
    title: formData.get("title").trim(),
    type: formData.get("type"),
    url: formData.get("url").trim(),
    summary: formData.get("summary").trim(),
    access,
    freePercent: access === "free" ? 100 : Number(formData.get("freePercent") || 35),
  };

  const works = [normalizeWork(work), ...readWorks().map(normalizeWork)];
  saveWorks(works);
  workForm.reset();
  enhanceWorkForm();
  activeFilter = "all";
  filterButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === "all");
  });
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
  filterButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === "all");
  });
  renderWorks();
});

injectResponsiveStyles();
enhanceWorkForm();
year.textContent = new Date().getFullYear();
renderWorks();
