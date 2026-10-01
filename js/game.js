// "游戏" view: 汉字雨 — type the code of falling characters/words before they land.
const GameView = (() => {
  const POOLS = {
    level1: { name: "一级简码", items: () => WUBI_DATA.level1.map(e => ({ text: e.c, codes: [e.code], show: e.code })) },
    keyname: { name: "键名汉字", items: () => Object.entries(WUBI_DATA.roots.keys).map(([k, i]) => ({ text: i.keyName, codes: [k.toLowerCase().repeat(4)], show: k.toLowerCase().repeat(4) })) },
    chengzi: { name: "键内汉字", items: () => WUBI_DATA.chengzi.map(e => ({ text: e.c, codes: [e.code], show: e.code })) },
    char: { name: "常用单字", items: () => WUBI_DATA.chars.slice(0, 500).map(e => ({ text: e.c, codes: e.codes, show: e.short })) },
    w2: { name: "二字词", items: () => WUBI_DATA.words["2"].slice(0, 600).map(e => ({ text: e.w, codes: [e.code], show: e.code })) },
    w3: { name: "三字词", items: () => WUBI_DATA.words["3"].slice(0, 400).map(e => ({ text: e.w, codes: [e.code], show: e.code })) },
    w4: { name: "四字词语", items: () => WUBI_DATA.words["4"].slice(0, 400).map(e => ({ text: e.w, codes: [e.code], show: e.code })) }
  };
  const LIVES = 5;

  function init(root) {
    const field = root.querySelector("#game-field");
    const input = root.querySelector("#game-input");
    const hud = root.querySelector("#game-hud");
    const log = root.querySelector("#game-log");
    const poolSel = root.querySelector("#game-pool");
    const startBtn = root.querySelector("#game-start");

    poolSel.innerHTML = Object.entries(POOLS).map(([id, p]) => `<option value="${id}">${p.name}</option>`).join("");

    let raf = null, pool = [], drops = [], running = false;
    let score, lives, level, hits, combo, lastTs, spawnIn;

    function renderHud() {
      const best = Storage.state.gameBest[poolSel.value] || 0;
      hud.innerHTML = `<span>得分 <b>${score}</b></span><span>关卡 <b>${level}</b></span>` +
        `<span>连击 <b class="streak">${combo}</b></span><span class="lives">${"♥".repeat(lives)}<span class="off">${"♥".repeat(LIVES - lives)}</span></span>` +
        `<span>最高分 <b>${best}</b></span>`;
    }

    function speed() { return 28 + level * 7; }            // px per second
    function spawnGap() { return Math.max(650, 2300 - level * 160); } // ms

    function spawn() {
      const active = new Set(drops.map(d => d.item.text));
      const candidates = pool.filter(it => !active.has(it.text));
      if (!candidates.length) return;
      const item = Common.randomItem(candidates);
      const el = document.createElement("div");
      el.className = "drop";
      el.textContent = item.text;
      field.appendChild(el);
      const maxX = Math.max(0, field.clientWidth - el.offsetWidth - 8);
      el.style.left = Math.round(4 + Math.random() * maxX) + "px";
      drops.push({ item, el, y: -40 });
    }

    function removeDrop(d, cls) {
      drops = drops.filter(x => x !== d);
      d.el.classList.add(cls);
      setTimeout(() => d.el.remove(), 350);
    }

    function frame(ts) {
      if (!running) return;
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
      lastTs = ts;
      spawnIn -= dt * 1000;
      if (spawnIn <= 0) { spawn(); spawnIn = spawnGap(); }
      const floor = field.clientHeight - 36;
      for (const d of drops.slice()) {
        d.y += speed() * dt;
        d.el.style.transform = `translateY(${d.y}px)`;
        if (d.y >= floor) {
          removeDrop(d, "missed");
          lives--; combo = 0;
          log.innerHTML = `漏掉了：<b>${d.item.text}</b> = <span class="mono">${d.item.show}</span>`;
          renderHud();
          if (lives <= 0) return gameOver();
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function onInput() {
      if (!running) return;
      input.value = input.value.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const v = input.value;
      if (!v) return;
      const target = drops.filter(d => d.item.codes.includes(v)).sort((a, b) => b.y - a.y)[0];
      if (target) {
        removeDrop(target, "hit");
        hits++; combo++;
        score += 10 * level * (1 + Math.floor(combo / 5));
        if (hits % 10 === 0) { level++; log.innerHTML = `升到第 <b>${level}</b> 关，速度加快！`; }
        input.value = "";
        renderHud();
        return;
      }
      const prefix = drops.some(d => d.item.codes.some(c => c.startsWith(v)));
      if (!prefix || v.length >= 4) {
        combo = 0;
        input.classList.add("wrong");
        setTimeout(() => input.classList.remove("wrong"), 250);
        input.value = "";
        renderHud();
      }
    }

    function start() {
      stop();
      field.querySelectorAll(".drop, .game-over").forEach(el => el.remove());
      pool = POOLS[poolSel.value].items();
      drops = []; score = 0; lives = LIVES; level = 1; hits = 0; combo = 0; lastTs = 0; spawnIn = 0;
      log.textContent = "输入字词的编码消灭它们，别让它们落地。";
      running = true;
      renderHud();
      input.value = "";
      input.disabled = false;
      input.focus();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function gameOver() {
      stop();
      input.disabled = true;
      const isBest = Storage.recordGame(poolSel.value, score);
      renderHud();
      const over = document.createElement("div");
      over.className = "game-over";
      over.innerHTML = `<div class="go-title">游戏结束</div><div class="big-num">${score}</div>` +
        `<div>${isBest && score > 0 ? "新纪录！" : `到达第 ${level} 关`}</div><button class="btn" id="game-again">再玩一次</button>`;
      field.appendChild(over);
      over.querySelector("#game-again").addEventListener("click", start);
    }

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", e => {
      if (e.key === "Escape" || e.key === " ") { e.preventDefault(); input.value = ""; }
    });
    startBtn.addEventListener("click", start);
    poolSel.addEventListener("change", () => { stop(); renderIdle(); });

    function renderIdle() {
      score = 0; lives = LIVES; level = 1; combo = 0;
      field.querySelectorAll(".drop, .game-over").forEach(el => el.remove());
      input.disabled = true;
      renderHud();
      log.textContent = "选好内容，点「开始游戏」。每消灭 10 个升一关，连击越多得分越高。";
    }

    renderIdle();
    return stop;
  }

  return { init };
})();
