(() => {
  const platformDestinations = {
    substack: "https://substack.com/home",
    youtube: "https://studio.youtube.com/",
    xiaohongshu: "https://creator.xiaohongshu.com/",
    tiktok: "https://www.tiktok.com/upload",
  };

  const platformNames = {
    native: "系统分享",
    wechat: "微信",
    copy: "复制文案",
    substack: "Substack",
    youtube: "YouTube",
    xiaohongshu: "小红书",
    tiktok: "TikTok",
    x: "X",
    linkedin: "LinkedIn",
    weibo: "微博",
  };

  const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const splitSentences = (text) =>
    compact(text)
      .split(/(?<=[。！？.!?；;])\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

  const scoreSentence = (sentence) => {
    const keywords = ["长期", "资产", "复利", "系统", "关系", "注意力", "创作者", "订阅", "底层", "能力", "改变"];
    const keywordScore = keywords.reduce((sum, keyword) => sum + (sentence.includes(keyword) ? 4 : 0), 0);
    const length = sentence.length;
    const lengthScore = length >= 16 && length <= 72 ? 10 : Math.max(0, 8 - Math.abs(length - 44) / 8);
    return keywordScore + lengthScore;
  };

  const pickGoldenLine = (title, summary) => {
    const candidates = [...splitSentences(summary), compact(title)].filter(Boolean);
    if (!candidates.length) return compact(title) || "一段值得停下来读的内容";
    return candidates.sort((a, b) => scoreSentence(b) - scoreSentence(a))[0];
  };

  const buildInterpretation = (work) => {
    const type = work.type || "内容";
    const access = work.accessText || "";
    if (type.includes("音频") || type.includes("播客")) {
      return `我的理解：这期内容适合边听边整理自己的行动清单，不只是听观点，而是把它变成下一步。${access}`;
    }
    if (type.includes("项目")) {
      return `我的理解：这不是单点工具，而是在把创作、分发、收款和复盘串成一个可运转的系统。${access}`;
    }
    return `我的理解：这篇内容的重点不是信息量，而是帮人重新组织自己的判断和长期行动。${access}`;
  };

  const readWorkFromCard = (card) => {
    const title = compact(card.querySelector("h3")?.textContent);
    const summary = compact(card.querySelector("p")?.textContent);
    const url = card.querySelector(".work-link")?.href || window.location.href;
    const type = compact(card.querySelector(".work-type")?.textContent);
    const accessText = compact(card.querySelector(".preview-copy")?.textContent);
    return { title, summary, url, type, accessText };
  };

  const buildShareText = (work, platform) => {
    const goldenLine = pickGoldenLine(work.title, work.summary);
    const platformLead = platform === "wechat"
      ? "我想分享一个今天看到的好内容："
      : platform === "xiaohongshu"
        ? "今天读到一个很适合收藏的观点："
        : "分享一个值得展开看的内容：";
    return [
      platformLead,
      `《${work.title}》`,
      `金句：${goldenLine}`,
      buildInterpretation(work),
      work.summary ? `看点：${work.summary}` : "",
      `链接：${work.url}`,
      "文案可直接粘贴，也可以删掉改成自己的分享感受。",
    ].filter(Boolean).join("\n\n");
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const buildShareUrl = (platform, work, text) => {
    const encodedUrl = encodeURIComponent(work.url);
    const encodedText = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(work.title);
    const targets = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      weibo: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
    };
    return targets[platform];
  };

  const handleSmartShare = async (event) => {
    const button = event.target.closest("[data-share]");
    if (!button) return;
    const card = button.closest(".work-card");
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const platform = button.dataset.share;
    const work = readWorkFromCard(card);
    const shareText = buildShareText(work, platform);
    const previousText = button.textContent;

    try {
      if (platform === "native" && navigator.share) {
        await navigator.share({ title: work.title, text: shareText, url: work.url });
        button.textContent = "已打开分享";
      } else {
        await copyText(shareText);
        const destination = platformDestinations[platform] || buildShareUrl(platform, work, shareText);
        if (destination && platform !== "copy" && platform !== "wechat") {
          window.open(destination, "_blank", "noopener,noreferrer");
        }
        button.textContent = platform === "wechat"
          ? "已复制微信文案"
          : `已生成${platformNames[platform] || "分享"}文案`;
      }
    } catch (error) {
      console.warn("Smart share failed", error);
      button.textContent = "生成失败";
    }

    window.setTimeout(() => {
      button.textContent = previousText;
    }, 1800);
  };

  document.addEventListener("click", handleSmartShare, true);
})();
