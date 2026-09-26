// Tab routing and home-page stats.
(() => {
  const app = document.getElementById("app");
  const tabBtns = document.querySelectorAll(".tab-btn");

  const INIT = {
    home: initHome,
    keyboard: RootsView.initChart,
    drill: RootsView.initDrill,
    decompose: TypingView.initDecompose,
    typing: TypingView.initTyping
  };

  function show(tab) {
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    const tpl = document.getElementById("tpl-" + tab);
    app.innerHTML = "";
    app.appendChild(tpl.content.cloneNode(true));
    INIT[tab](app);
    location.hash = tab;
  }

  function initHome(root) {
    const s = Storage.state;

    const rootSeen = Object.values(s.rootStats).reduce((n, v) => n + v.seen, 0);
    if (rootSeen) {
      root.querySelector("#home-root-stat").textContent =
        `已答 ${rootSeen} 题 · 正确率 ${Storage.rootMasteryPercent()}% · 覆盖 ${Object.keys(s.rootStats).length}/25 键`;
    }

    if (s.charStats.seen) {
      const pct = Math.round((s.charStats.correct / s.charStats.seen) * 100);
      root.querySelector("#home-decompose-stat").textContent = `已练 ${s.charStats.seen} 字 · 正确率 ${pct}%`;
    }

    if (s.typingHistory.length) {
      const best = Math.max(...s.typingHistory.map(h => h.cpm));
      const last = s.typingHistory[s.typingHistory.length - 1];
      root.querySelector("#home-typing-stat").textContent =
        `最近一轮 ${last.cpm} 码/分 · 正确率 ${last.accuracy}% · 最佳 ${best} 码/分`;
    }

    root.querySelectorAll("[data-goto]").forEach(btn => {
      btn.addEventListener("click", () => show(btn.dataset.goto));
    });
  }

  tabBtns.forEach(btn => btn.addEventListener("click", () => show(btn.dataset.tab)));

  const initial = location.hash.replace("#", "");
  show(INIT[initial] ? initial : "home");
})();
