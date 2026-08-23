(() => {
  const storageKey = "yiten-site-language";
  const toggle = document.querySelector("#languageToggle");
  const dictionary = new Map(
    Object.entries({
      "免费测评": "Free Checkup",
      "工具包": "Tools",
      "书籍": "Books",
      "只富一次 / 家庭财富守恒系统": "Only Get Rich Once / Family Wealth Defense System",
      "你不是不会赚钱，": "It is not that you cannot make money,",
      "你是还没有一套防止返贫的家庭系统。": "you do not yet have a family system that prevents falling back.",
      "用 3 分钟完成一次家庭财务体检，快速看清你的现金流、债务、应急金和家庭风险等级。先看见问题，再谈守住财富。": "Run a 3-minute family finance checkup to see cash flow, debt, emergency reserves, and household risk level before talking about keeping wealth.",
      "开始免费体检": "Start Free Checkup",
      "了解《只富一次》三部曲": "Explore the Trilogy",
      "3分钟完成": "3 minutes",
      "无需注册": "No signup",
      "立即生成风险建议": "Instant risk suggestions",
      "先免费帮你看见问题，再决定要不要继续深入。": "See the problem first, then decide whether to go deeper.",
      "《只富一次》不制造暴富幻觉，而是帮助普通家庭识别现金流、债务、消费、关系、人情、健康、老人、孩子和黑天鹅风险，避免第一次有钱后又系统性返贫。": "Only Get Rich Once does not sell fantasies. It helps ordinary households identify cash flow, debt, consumption, relationship, health, eldercare, child, and black-swan risks.",
      "很多家庭不是没有努力，而是没有防线。": "Many families are not lacking effort; they are lacking defenses.",
      "真正危险的往往不是单次错误，而是现金流、债务、关系支出和突发事件连在一起后形成的系统性下坠。": "The real danger is often not one mistake, but the way cash flow, debt, relationship spending, and shocks compound together.",
      "现金流一断，生活立刻失控": "When cash flow breaks, life loses control fast",
      "没有足够应急金时，一次失业、停工或业务波动就会逼迫家庭借债。": "Without enough emergency cash, job loss or business volatility can force a household into debt.",
      "收入上涨后，消费也跟着失控": "When income rises, spending can rise with it",
      "当生活方式先升级，真正能留下来的现金反而越来越少。": "When lifestyle upgrades first, less cash is actually left behind.",
      "亲友借钱、人情支出吞掉安全垫": "Loans to friends and family can eat the safety cushion",
      "关系压力如果没有边界，会把本来用来保护家庭的现金消耗掉。": "Without boundaries, relationship pressure can consume the cash meant to protect the family.",
      "买错资产，把积蓄变成长期负担": "The wrong asset can turn savings into a burden",
      "不理解流动性、杠杆和持有成本时，资产也可能变成压力源。": "Without understanding liquidity, leverage, and holding cost, assets can become stress.",
      "一次疾病、失业、离婚，击穿多年积累": "One illness, job loss, or divorce can pierce years of savings",
      "家庭系统没有保险、现金和决策预案时，黑天鹅会放大损失。": "Without insurance, cash, and decision plans, black swans magnify losses.",
      "第一次有钱后，把好运误判成能力": "After the first money, luck is easily mistaken for skill",
      "好运带来的钱最容易被高估，真正要补的是守住财富的系统。": "Money from luck is easy to overestimate; the missing piece is the system to keep it.",
      "最新作品：免费家庭财务体检": "Latest Work: Free Family Finance Checkup",
      "填写几个基础数据，系统会给出一个简版风险等级。这个测评不能替代专业财务建议，但能帮助你快速发现家庭财务结构里的薄弱环节。": "Enter a few basic numbers to receive a simple risk level. This is not professional financial advice, but it helps reveal weak points.",
      "家庭月收入": "Monthly household income",
      "每月必要支出": "Monthly essential expenses",
      "每月债务还款": "Monthly debt payments",
      "现有可动用现金": "Available cash",
      "家庭总资产": "Total household assets",
      "家庭总负债": "Total household liabilities",
      "家庭主要收入来源数量": "Number of main income sources",
      "是否已有基础医保": "Basic medical coverage",
      "是否有 6 个月以上应急金": "Emergency fund over 6 months",
      "过去一年是否有明显冲动消费": "Impulse spending in the past year",
      "亲友借钱时是否难以拒绝": "Difficulty refusing family/friend loans",
      "如果收入中断，家庭能撑多久": "How long could the household last if income stopped",
      "生成我的风险结果": "Generate My Risk Result",
      "完成简版体检后，你可以继续领取工具包、阅读三部曲，或者订阅 Newsletter 获取免费清单。": "After the checkup, you can continue with the toolkit, the trilogy, or the Newsletter checklist.",
      "获取完整版工具包": "Get Full Toolkit",
      "阅读《只富一次》三部曲": "Read the Trilogy",
      "订阅 Newsletter": "Subscribe to Newsletter",
      "更多文章与札记": "More Essays and Notes",
      "这些入口不需要先购买，适合第一次了解《只富一次》的读者。": "These are no-purchase entry points for first-time readers.",
      "家庭财务体检表": "Family Finance Checkup",
      "看清收入、支出、负债、应急金和风险等级。": "See income, expenses, debt, emergency reserves, and risk level.",
      "50万财富守恒测评": "500k Wealth Defense Assessment",
      "测试你拿到第一笔大钱后，是否有 18-36 个月返贫风险。": "Test whether your first large sum carries an 18-36 month fall-back risk.",
      "家庭防坠落风险地图": "Family Anti-Fall Risk Map",
      "定位收入、健康、债务、老人、孩子、婚姻、关系和黑天鹅风险。": "Map income, health, debt, elders, children, marriage, relationships, and black-swan risks.",
      "查看工具": "View Tool",
      "《只富一次》三部曲与配套工具包": "Only Get Rich Once Trilogy and Toolkit",
      "免费体检之后，如果你想系统修复现金流、债务、人情支出、资产结构和家庭风险地图，可以继续阅读三部曲和工具包。": "After the free checkup, use the trilogy and toolkit to repair cash flow, debt, social spending, asset structure, and family risk maps.",
      "《只富一次》三部曲": "Only Get Rich Once Trilogy",
      "普通人的财富守恒系统：不教你制造暴富幻觉，而是帮助家庭建立现金流、债务、人情、健康、资产和黑天鹅防线。": "A wealth-defense system for ordinary households: cash flow, debt, relationships, health, assets, and black-swan defenses.",
      "系列一：普通人的财富守恒法则": "Book 1: Wealth Defense Rules for Ordinary People",
      "系列二：消费陷阱与资产配置": "Book 2: Consumption Traps and Asset Allocation",
      "系列三：家庭防坠落系统": "Book 3: Family Anti-Fall System",
      "三部曲套装": "Trilogy Bundle",
      "包含三部曲电子书、家庭风险地图、现金流修复表、30 天行动清单和配套音频。": "Includes the trilogy, family risk map, cash-flow repair sheet, 30-day action checklist, and companion audio.",
      "作品": "Works",
      "播客": "Podcast",
      "电子书": "Books",
      "订阅": "Subscribe",
      "把长期思考，变成一个可以被订阅的个人宇宙。": "Turn long-term thinking into a personal universe people can subscribe to.",
      "这里发布文章、作品、播客、电子书、研究札记和项目更新。读者可以单独购买书籍，也可以订阅后获得会员价。": "Essays, projects, podcasts, books, research notes, and product updates live here. Readers can buy books individually or subscribe for member pricing.",
      "购买电子书": "Buy E-book",
      "订阅": "Subscribe",
      "一个清醒、克制、耐读的个人主页。": "A calm, focused, and readable personal home.",
      "内容优先，信息清楚，适合作为你的文章、项目、播客、电子书和会员订阅入口。": "Built around content, clarity, essays, projects, podcasts, books, and membership.",
      "音频播客": "Audio Podcast",
      "精选音频内容已纳入本站会员权益。订阅后可在这里连续收听，并查看完整会员资源库。": "Selected audio is included as a member benefit. Subscribe to listen here and browse the full member library.",
      "Himalaya 课程": "Himalaya Course",
      "正在加载喜马拉雅节目": "Loading Himalaya episodes",
      "节目列表会在这里显示。点击右侧声音即可收听。": "Episodes will appear here. Choose one to start listening.",
      "最新作品": "Latest Work",
      "为什么个人网站仍然重要": "Why Personal Websites Still Matter",
      "当平台不断变化，个人网站是你的思想、作品和关系的长期资产。它不是简历，而是一块可以持续复利的土地。": "When platforms keep changing, a personal website is the long-term asset for your ideas, work, and relationships. It is not a resume; it is a place that compounds.",
      "从零搭建个人内容资产库": "Build a Personal Content Asset Library",
      "把文章、音频、电子书和研究札记整理成可检索、可复用、可持续更新的长期资料库。": "Organize essays, audio, e-books, and research notes into a searchable, reusable, continuously updated knowledge base.",
      "关于注意力的十二条札记": "Twelve Notes on Attention",
      "一些短句和观察：如何减少信息噪音，如何把灵感收集成主题，如何让阅读真正改变行动。": "Short notes and observations on reducing noise, turning inspiration into themes, and making reading change action.",
      "全部": "All",
      "文章": "Essays",
      "项目": "Projects",
      "札记": "Notes",
      "电子书商店": "Bookstore",
      "任何游客均可购买电子书。订阅会员可使用会员折扣价购买；电子书支持 PDF、EPUB、MOBI、音频补充包和配套资料。": "Anyone can buy e-books. Members receive discounted pricing. Files can include PDF, EPUB, MOBI, audio bonuses, and companion materials.",
      "长期思考与个人系统": "Long-Term Thinking and Personal Systems",
      "一本给独立创作者、知识工作者和长期主义者的操作手册：把想法、内容、订阅关系和个人流程，整理成可以复利增长的系统。": "A practical manual for independent creators, knowledge workers, and long-term thinkers: turn ideas, content, subscribers, and personal workflows into a compounding system.",
      "从零搭建个人内容资产库": "Build a personal content asset library from scratch",
      "把文章、播客、电子书和订阅串成收入闭环": "Connect essays, podcasts, e-books, and membership into one revenue loop",
      "附赠音频补充包、模板和配套资料": "Includes audio notes, templates, and companion materials",
      "适合想系统化创作、搭建付费内容产品、把知识沉淀成长期资产的人。": "For people who want to systematize creation, build paid content products, and turn knowledge into long-term assets.",
      "音频": "Audio",
      "资料包": "Pack",
      "/ 游客价": "/ visitor",
      "游客购买电子书": "Buy as Visitor",
      "套装捆绑": "Bundle",
      "创作者系统三件套": "Creator System Kit",
      "把核心电子书、工作模板和音频补充课打包购买，适合一次性搭建自己的内容生产、发布和商业化流程。": "Buy the core e-book, workflow templates, and audio companion lessons together to set up your creation, publishing, and monetization workflow in one pass.",
      "01 长期思考与个人系统": "01 Long-Term Thinking and Personal Systems",
      "02 内容资产库模板": "02 Content Asset Library Template",
      "03 订阅产品启动清单": "03 Membership Product Launch Checklist",
      "音频补充包 + 配套资料": "Audio Notes + Companion Pack",
      "套装比单独购买更划算；会员可叠加专属折扣。": "The bundle is better value than buying separately; members get an extra discount.",
      "/ 套装价": "/ bundle",
      "购买套装": "Buy Bundle",
      "会员套装价": "Member Bundle",
      "会员折扣": "Member Discount",
      "订阅会员专属价": "Member Price",
      "已经订阅会员的读者可用折扣价购买电子书。正式会员识别会在登录系统接入后自动校验。": "Members can buy e-books at a discounted price. Membership verification will be automated after login is connected.",
      "多格式下载": "Multi-format",
      "更新版同步": "Updates Included",
      "会员价": "Member Price",
      "/ 会员价": "/ member",
      "会员价购买": "Buy at Member Price",
      "免费接收更新": "Get Free Updates",
      "留下邮箱，接收新文章、播客、电子书上架和会员专属内容提醒。": "Leave your email to receive new essays, podcasts, book releases, and member-only updates.",
      "邮箱": "Email",
      "订阅与支付": "Membership and Payments",
      "一个卡片完成方案选择和支付。PayPal 与银行卡可用，更多本地支付方式会陆续开放。": "Choose a plan and pay in one card. PayPal and cards are available, with more local payment methods coming soon.",
      "会员权益": "Member Benefits",
      "解锁文章、播客、电子书折扣和喜马拉雅会员资源": "Unlock essays, podcasts, e-book discounts, and Himalaya member resources",
      "选择月度、季度或年度会员后，使用下方支付方式完成订阅。": "Choose monthly, quarterly, or yearly membership, then pay below.",
      "当前应付": "Due Today",
      "年度会员": "Yearly",
      "月度会员": "Monthly",
      "季度会员": "Quarterly",
      "按月体验": "Try monthly",
      "适合深度试用": "Best for a deeper trial",
      "推荐，会员权益完整": "Recommended, full benefits",
      "完整内容解锁": "Full Content",
      "喜马拉雅授权内容入口": "Himalaya Access",
      "会员播客": "Member Podcast",
      "电子书会员价": "Book Discount",
      "银行卡": "Card",
      "微信支付": "WeChat Pay",
      "支付宝": "Alipay",
      "创建支付链接": "Create Payment Link",
      "标题": "Title",
      "类型": "Type",
      "链接": "Link",
      "摘要": "Summary",
      "发布到作品墙": "Publish to Wall",
      "恢复示例": "Restore Demo",
      "订阅解锁": "Unlock with membership",
      "会员可听": "Members",
      "复制微信引流文案 + 链接": "Copy WeChat copy + link",
      "分享到 Substack": "Share to Substack",
      "分享到 YouTube": "Share to YouTube",
      "分享到小红书": "Share to Xiaohongshu",
      "分享到 TikTok": "Share to TikTok",
      "原生分享": "Native Share",
      "使用分享奖励解锁": "Unlock with share reward",
      "已订阅。后续更新会发送到你的邮箱。": "Subscribed. Future updates will be sent to your inbox.",
      "收藏到桌面": "Save to Home Screen",
      "隐私政策": "Privacy Policy",
      "用户协议": "Terms",
      "Cookie 声明": "Cookie Notice",
    })
  );

  const shouldSkip = (node) => {
    const parent = node.parentElement;
    if (!parent) return true;
    return ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(parent.tagName);
  };
  const originals = new WeakMap();
  let isApplying = false;

  const translateText = (text, lang) => {
    if (lang === "zh") return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (dictionary.has(trimmed)) return text.replace(trimmed, dictionary.get(trimmed));
    return null;
  };

  const applyLanguage = (lang) => {
    if (isApplying) return;
    isApplying = true;
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.body.dataset.lang = lang;
    toggle.textContent = lang === "en" ? "中" : "EN";
    toggle.setAttribute("aria-label", lang === "en" ? "切换中文" : "Switch to English");

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (originals.has(node)) node.textContent = originals.get(node);
    });

    if (lang === "zh") {
      isApplying = false;
      return;
    }
    nodes.forEach((node) => {
      if (shouldSkip(node)) return;
      const translated = translateText(node.textContent, lang);
      if (!translated) return;
      if (!originals.has(node)) originals.set(node, node.textContent);
      node.textContent = translated;
    });
    isApplying = false;
  };

  let currentLang = localStorage.getItem(storageKey) || "zh";
  window.YitenI18n = {
    getLanguage: () => currentLang,
    t: (value) => {
      const text = String(value || "");
      if (currentLang !== "en") return text;
      return dictionary.get(text.trim()) || text;
    },
    apply: () => applyLanguage(currentLang),
  };
  const safeApply = () => window.requestAnimationFrame(() => applyLanguage(currentLang));

  toggle?.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "zh" : "en";
    localStorage.setItem(storageKey, currentLang);
    applyLanguage(currentLang);
    window.dispatchEvent(new CustomEvent("yiten:languagechange", { detail: { lang: currentLang } }));
  });

  safeApply();
  const observer = new MutationObserver(() => {
    if (currentLang === "en" && !isApplying) safeApply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
