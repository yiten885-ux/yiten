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
  value.replace(/[&<>"']/g, (character) => {
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

const renderWorks = () => {
  const works = readWorks();
  const visibleWorks =
    activeFilter === "all" ? works : works.filter((work) => work.type === activeFilter);

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
        </article>
      `
    )
    .join("");
};

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
