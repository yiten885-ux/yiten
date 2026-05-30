(() => {
  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

  const createInstallWidget = () => {
    if (document.querySelector(".install-widget") || isStandalone()) return;

    const widget = document.createElement("div");
    widget.className = "install-widget";
    widget.innerHTML = `
      <button class="install-button" type="button">收藏到桌面</button>
      <div class="install-tip" hidden>
        <strong>下次一键回来</strong>
        <p>电脑/安卓可直接安装到桌面；iPhone 请点浏览器分享按钮，再选“添加到主屏幕”。</p>
        <button type="button" class="install-close" aria-label="关闭提示">关闭</button>
      </div>
    `;
    document.body.appendChild(widget);

    const button = widget.querySelector(".install-button");
    const tip = widget.querySelector(".install-tip");
    const close = widget.querySelector(".install-close");

    button.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        widget.remove();
        return;
      }
      tip.hidden = !tip.hidden;
    });

    close.addEventListener("click", () => {
      tip.hidden = true;
    });
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallWidget();
  });

  window.addEventListener("appinstalled", () => {
    document.querySelector(".install-widget")?.remove();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }

  window.setTimeout(createInstallWidget, 1000);
})();
