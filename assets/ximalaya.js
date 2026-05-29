(() => {
  const config = {
    appKey: "3205f127eb7fff523d8d91b1a8bb0e6b",
    courseId: "3922776",
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

  const action = document.createElement("a");
  action.className = "button secondary";
  action.href = config.courseUrl;
  action.target = "_blank";
  action.rel = "noreferrer";
  action.textContent = "在 Himalaya 打开全集";
  playerPanel.appendChild(action);

  const setStatus = (message) => {
    status.textContent = message;
  };

  const getDeviceId = () => {
    const key = "ximalaya-device-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const generated =
      (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
      `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, generated);
    return generated;
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (window.xmsdk) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("喜马拉雅 JSSDK 加载失败"));
      document.head.appendChild(script);
    });

  const trackIds = () => config.episodes.map((episode) => episode.id);
  const episodeUrl = (episode) => `https://www.himalaya.com${episode.path}`;

  const setEpisodeText = (episode, readyForSdk) => {
    episodeLabel.textContent = "Himalaya 课程";
    episodeTitle.textContent = episode.title;
    episodeSummary.textContent = readyForSdk
      ? "音频由 Himalaya / 喜马拉雅开放能力提供，点击后会通过 JSSDK 播放。"
      : "当前后端签名接口未上线时，可先通过右侧链接跳转到 Himalaya 收听。";
    action.href = episodeUrl(episode);
    action.textContent = "在 Himalaya 打开这一集";
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
      link.innerHTML = `
        <span>Himalaya</span>
        <strong>${episode.title}</strong>
        <small>${episode.duration}</small>
      `;
      link.addEventListener("click", () => setEpisodeText(episode, false));
      episodeList.appendChild(link);
    });
    setEpisodeText(config.episodes[0], false);
  };

  const createXimalayaButton = (episode, index, player) => {
    const button = document.createElement("button");
    button.className = `episode-button${index === 0 ? " active" : ""}`;
    button.type = "button";
    button.dataset.ximalayaId = String(episode.id);
    button.innerHTML = `
      <span>Himalaya</span>
      <strong>${episode.title}</strong>
      <small>${episode.duration}</small>
    `;
    button.addEventListener("click", () => {
      document.querySelectorAll(".episode-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setEpisodeText(episode, true);
      if (nativePlayer) nativePlayer.hidden = true;
      try {
        player.play(episode.id);
        setStatus("正在通过喜马拉雅 JSSDK 播放。若浏览器拦截或接口未通过审核，请用下方 Himalaya 链接收听。");
      } catch (error) {
        setStatus("JSSDK 播放暂不可用，已保留 Himalaya 原站收听入口。");
      }
    });
    return button;
  };

  const boot = async () => {
    renderFallbackList();
    setStatus("正在连接喜马拉雅播放器...");
    await loadScript(config.sdkUrl);

    const { config: xmConfig, XMplayer } = window.xmsdk || {};
    if (!xmConfig || !XMplayer) throw new Error("喜马拉雅 JSSDK 对象不可用");

    xmConfig({
      app_key: config.appKey,
      sig_url: config.signatureEndpoint,
      device_id: getDeviceId(),
      timeout: 10000,
      debug: false,
    });

    const player = new XMplayer({
      playlist: trackIds(),
      playMode: "order",
      breakpoint: true,
      autoSkip: true,
    });

    episodeList.innerHTML = "";
    config.episodes.forEach((episode, index) => {
      episodeList.appendChild(createXimalayaButton(episode, index, player));
    });

    if (nativePlayer) nativePlayer.hidden = true;
    setEpisodeText(config.episodes[0], true);
    setStatus("喜马拉雅播放器已接入。首次播放会向后端签名接口请求授权。");
  };

  boot().catch((error) => {
    renderFallbackList();
    setStatus(`${error.message}。已切换为 Himalaya 原站收听入口，后端签名接口上线后会自动启用站内播放器。`);
  });
})();
