(() => {
  const config = {
    appKey: "3205f127eb7fff523d8d91b1a8bb0e6b",
    signatureEndpoint: "/api/ximalaya/jssdk-sign",
    sdkUrl: "https://s1.xmcdn.com/sr012018/web-jssdk/1.1.0/dist/xmsdk.min.js",
    // Fill this list with real Ximalaya sound IDs before submitting the app for review.
    trackIds: [],
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

  const renderWaitingState = () => {
    episodeLabel.textContent = "喜马拉雅接入中";
    episodeTitle.textContent = "等待配置喜马拉雅声音 ID";
    episodeSummary.textContent =
      "网站已经接入喜马拉雅 H5 JSSDK 的入口。把你的喜马拉雅声音 ID 填入 assets/ximalaya.js 后，用户就会在这里收听正式节目。";
    setStatus("喜马拉雅播放器已准备，下一步需要填入真实声音 ID 并部署后端签名接口。");
  };

  const createXimalayaButton = (trackId, index, player) => {
    const button = document.createElement("button");
    button.className = `episode-button${index === 0 ? " active" : ""}`;
    button.type = "button";
    button.dataset.ximalayaId = String(trackId);
    button.innerHTML = `
      <span>喜马拉雅</span>
      <strong>声音 ${trackId}</strong>
      <small>点击播放</small>
    `;
    button.addEventListener("click", () => {
      document.querySelectorAll(".episode-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      episodeLabel.textContent = "喜马拉雅播客";
      episodeTitle.textContent = `正在播放声音 ${trackId}`;
      episodeSummary.textContent = "音频由喜马拉雅开放平台提供，支持断点续播和列表播放。";
      if (nativePlayer) nativePlayer.hidden = true;
      player.play(trackId);
    });
    return button;
  };

  const boot = async () => {
    if (!config.trackIds.length) {
      renderWaitingState();
      return;
    }

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
      playlist: config.trackIds,
      playMode: "order",
      breakpoint: true,
      autoSkip: true,
    });

    episodeList.innerHTML = "";
    config.trackIds.forEach((trackId, index) => {
      episodeList.appendChild(createXimalayaButton(trackId, index, player));
    });

    if (nativePlayer) nativePlayer.hidden = true;
    episodeLabel.textContent = "喜马拉雅播客";
    episodeTitle.textContent = `已接入 ${config.trackIds.length} 个声音`;
    episodeSummary.textContent = "点击右侧节目即可播放喜马拉雅音频。";
    setStatus("喜马拉雅播放器已连接，可以播放。首次播放会向后端签名接口请求授权。");
  };

  boot().catch((error) => {
    setStatus(`${error.message}。页面会保留原本的试听播放器，不影响网站其它功能。`);
  });
})();
