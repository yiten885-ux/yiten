(() => {
  const config = {
    appKey: "3205f127eb7fff523d8d91b1a8bb0e6b",
    courseUrl: "https://www.himalaya.com/courses/3922776",
    signatureEndpoint: "/api/ximalaya/jssdk-sign",
    sdkUrl: "https://s1.xmcdn.com/sr012018/web-jssdk/1.1.0/dist/xmsdk.min.js",
    episodes: [
      { id: 179402477, title: "真相本质——什么是这个世界的真相？", duration: "48s", path: "/episode/179402477" },
      { id: 179402478, title: "真相本质01 底层逻辑就是事物运作的基本规律", duration: "2min", path: "/episode/01-179402478" },
      { id: 179402479, title: "真相本质02 学好基础学科打好底层基础", duration: "2min", path: "/episode/02-179402479" },
      { id: 179402480, title: "真相本质03 底层逻辑和思维模型之间的关系", duration: "3min", path: "/episode/03-179402480" },
      { id: 179402481, title: "真相本质04 弃道求术", duration: "34s", path: "/episode/04-179402481" },
      { id: 179402482, title: "真相本质05 获取知识的能力远比知识本身更重要", duration: "3min", path: "/episode/05-179402482" },
    ],
  };

  const playerPanel = document.querySelector(".player-panel");
  const episodeList = document.querySelector("#episodeList");
  const nativePlayer = document.querySelector("#episodePlayer");
  const episodeLabel = document.querySelector("#episodeLabel");
  const episodeTitle = document.querySelector("#episodeTitle");
  const episodeSummary = document.querySelector("#episodeSummary");
  if (!playerPanel || !episodeList) return;

  const status = document.createElement("p");
  status.className = "form-message ximalaya-status";
  status.setAttribute("role", "status");
  playerPanel.appendChild(status);

  const actionRow = document.createElement("div");
  actionRow.className = "ximalaya-actions";

  const action = document.createElement("a");
  action.className = "button secondary";
  action.href = config.courseUrl;
  action.target = "_blank";
  action.rel = "noreferrer";
  action.textContent = "打开完整课程";

  const fullCatalogButton = document.createElement("button");
  fullCatalogButton.className = "button primary";
  fullCatalogButton.type = "button";
  fullCatalogButton.textContent = "展开会员资源库";

  actionRow.append(action, fullCatalogButton);
  playerPanel.appendChild(actionRow);

  const fullCatalog = document.createElement("div");
  fullCatalog.className = "ximalaya-catalog";
  fullCatalog.hidden = true;
  fullCatalog.innerHTML = `
    <div class="catalog-head">
      <strong>会员可听资源库</strong>
      <a href="${config.courseUrl}" target="_blank" rel="noreferrer">新窗口打开</a>
    </div>
    <iframe title="Himalaya course catalog" src="${config.courseUrl}" loading="lazy"></iframe>
    <p class="muted">订阅会员可在这里查看完整资源库。若当前环境无法内嵌显示，可使用右侧入口新窗口打开。</p>
  `;
  playerPanel.appendChild(fullCatalog);

  fullCatalogButton.addEventListener("click", () => {
    fullCatalog.hidden = !fullCatalog.hidden;
    fullCatalogButton.textContent = fullCatalog.hidden ? "展开会员资源库" : "收起会员资源库";
  });

  const setStatus = (message) => {
    status.textContent = message;
  };

  const getDeviceId = () => {
    const key = "ximalaya-device-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) || `web-${Date.now()}`;
    localStorage.setItem(key, generated);
    return generated;
  };

  const episodeUrl = (episode) => `https://www.himalaya.com${episode.path}`;
  const setEpisodeText = (episode, readyForSdk) => {
    episodeLabel.textContent = "Himalaya 课程";
    episodeTitle.textContent = episode.title;
    episodeSummary.textContent = readyForSdk
      ? "会员权益：订阅本站后可在这里连续收听精选音频，完整目录可展开会员资源库查看。"
      : "当前为精选音频目录。订阅本站后，可持续收听会员资源库中的内容。";
    action.href = episodeUrl(episode);
    action.textContent = "打开这一集";
  };

  const renderFallbackList = () => {
    if (nativePlayer) nativePlayer.hidden = true;
    episodeList.innerHTML = "";
    config.episodes.forEach((episode, index) => {
      const link = document.createElement("a");
      link.className = `episode-button${index === 0 ? " active" : ""}`;
      link.href = episodeUrl(episode);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.innerHTML = `<span>Himalaya</span><strong>${episode.title}</strong><small>${episode.duration}</small>`;
      link.addEventListener("click", () => setEpisodeText(episode, false));
      episodeList.appendChild(link);
    });
    setEpisodeText(config.episodes[0], false);
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (window.xmsdk) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("音频播放器加载失败"));
      document.head.appendChild(script);
    });

  const boot = async () => {
    renderFallbackList();
    setStatus("正在连接喜马拉雅播放器...");
    await loadScript(config.sdkUrl);
    const { config: xmConfig, XMplayer } = window.xmsdk || {};
    if (!xmConfig || !XMplayer) throw new Error("音频播放器暂不可用");
    xmConfig({ app_key: config.appKey, sig_url: config.signatureEndpoint, device_id: getDeviceId(), timeout: 10000, debug: false });
    const player = new XMplayer({ playlist: config.episodes.map((episode) => episode.id), playMode: "order", breakpoint: true, autoSkip: true });
    episodeList.innerHTML = "";
    config.episodes.forEach((episode, index) => {
      const button = document.createElement("button");
      button.className = `episode-button${index === 0 ? " active" : ""}`;
      button.type = "button";
      button.innerHTML = `<span>Himalaya</span><strong>${episode.title}</strong><small>${episode.duration}</small>`;
      button.addEventListener("click", () => {
        document.querySelectorAll(".episode-button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        setEpisodeText(episode, true);
        try {
          player.play(episode.id);
          setStatus("正在播放会员音频。完整目录请展开会员资源库。");
        } catch (_error) {
          setStatus("站内播放暂不可用，已保留备用收听入口。");
        }
      });
      episodeList.appendChild(button);
    });
    setEpisodeText(config.episodes[0], true);
    setStatus("会员音频播放器已就绪；完整资源库可在此模块展开查看。");
  };

  boot().catch((error) => {
    renderFallbackList();
    setStatus(`${error.message}。已切换为备用收听入口，完整目录可展开会员资源库。`);
  });
})();
