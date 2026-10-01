// Tab routing and home-page stats.
(() => {
  const app = document.getElementById("app");
  const tabBtns = document.querySelectorAll(".tab-btn");
  let cleanup = null;

  const INIT = {
    home: initHome,
    keyboard: RootsView.initChart,
    drill: RootsView.initDrill,
    decompose: TypingView.initDecompose,
    typing: TypingView.initTyping,
    game: GameView.init
  };

  function show(tab) {
    if (typeof cleanup === "function") cleanup();
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-" + tab).content.cloneNode(true));
    cleanup = INIT[tab](app);
    location.hash = tab;
  }

  function modeSummary(ids) {
    let seen = 0, correct = 0;
    ids.forEach(id => { const s = Storage.modeStat(id); seen += s.seen; correct += s.correct; });
    return seen ? `已答 ${seen} 题 · 正确率 ${Math.round((correct / seen) * 100)}%` : "";
  }

  function initHome(root) {
    const s = Storage.state;
    const set = (id, text) => { if (text) root.querySelector(id).textContent = text; };

    set("#home-drill-stat", modeSummary(["level1", "keyname", "chengzi", "root2key", "key2root"]));
    set("#home-decompose-stat", modeSummary(["decompose-common", "decompose-idcode", "decompose-hard"]));
    if (s.typingHistory.length) {
      const last = s.typingHistory[s.typingHistory.length - 1];
      const best = Math.max(...s.typingHistory.map(h => h.cpm));
      set("#home-typing-stat", `最近一轮 ${last.cpm} 码/分 · 正确率 ${last.accuracy}% · 最佳 ${best} 码/分`);
    }
    const bests = Object.values(s.gameBest);
    if (bests.length) set("#home-game-stat", `最高分 ${Math.max(...bests)}`);

    root.querySelectorAll("[data-goto]").forEach(btn =>
      btn.addEventListener("click", () => show(btn.dataset.goto)));
  }

  tabBtns.forEach(btn => btn.addEventListener("click", () => show(btn.dataset.tab)));

  const initial = location.hash.replace("#", "");
  show(INIT[initial] ? initial : "home");
})();
