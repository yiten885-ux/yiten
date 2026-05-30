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

const labels = {
  essay: "文章",
  project: "项目",
  note: "札记",
  audio: "音频",
};

const platformDestinations = {
  substack: "https://substack.com/home",
  youtube: "https://studio.youtube.com/",
  xiaohongshu: "https://creator.xiaohongshu.com/",
  tiktok: "https://www.tiktok.com/upload",
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

const buildDistributionText = (work) =>
  `${work.title}\n\n${work.summary}\n\n阅读全文：${work.url}\n\n发布自 Yiten Huang`;

const copyDistributionText = async (work) => {
  await navigator.clipboard.writeText(buildDistributionText(work));
};

const buildShareUrl = (platform, work) => {
  const url = encodeURIComponent(work.url);
  const title = encodeURIComponent(work.title);
  const text = encodeURIComponent(`${work.title} - ${work.summary}`);
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
    await navigator.share({ title: work.title, text: work.summary, url: work.url });
    return "已打开系统分享";
  }

  if (platform === "copy") {
    await copyDistributionText(work);
    return "已复制分发文案";
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
  const works = readWorks();
  const visibleWorks =
    activeFilter === "all" ? works : works.filter((work) => work.type === activeFilter);

  workGrid.innerHTML = visibleWorks
    .map(
      (work, index) => `
        <article class="work-card" data-index="${index}">
          <div>
            <span class="work-type">${labels[work.type] || "作品"}</span>
            <h3>${escapeHtml(work.title)}</h3>
            <p>${escapeHtml(work.summary)}</p>
          </div>
          <div class="work-actions">
            <a class="work-link" href="${escapeAttribute(work.url)}" target="_blank" rel="noreferrer">
              阅读 / 查看
            </a>
            <div class="share-actions" aria-label="分发 ${escapeAttribute(work.title)}">
              <button type="button" data-share="native">分享</button>
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
      `
    )
    .join("");
};

workGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share]");
  if (!button) return;
  const card = button.closest(".work-card");
  const works = activeFilter === "all" ? readWorks() : readWorks().filter((work) => work.type === activeFilter);
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
  const work = {
    title: formData.get("title").trim(),
    type: formData.get("type"),
    url: formData.get("url").trim(),
    summary: formData.get("summary").trim(),
  };

  const works = [work, ...readWorks()];
  saveWorks(works);
  workForm.reset();
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

year.textContent = new Date().getFullYear();
renderWorks();
