// "字根表" (root chart) view and "基础练习" (basic drills) view.
const RootsView = (() => {
  const keys = () => WUBI_DATA.roots.keys;

  function rootChip(root) {
    return `<span class="root-chip"><span class="glyph">${root.r}</span>${root.n ? `<small>${root.n}</small>` : ""}</span>`;
  }

  function initChart(root) {
    const kbWrap = root.querySelector("#kb-wrap");
    const detail = root.querySelector("#kb-detail");

    function showDetail(letter) {
      const info = keys()[letter];
      Keyboard.render(kbWrap, { onKeyClick: showDetail, selected: letter });
      if (!info) {
        detail.innerHTML = `<span class="hint">Z 键不放字根，用作万能学习键。</span>`;
        return;
      }
      const zone = WUBI_DATA.roots.zones[info.zone - 1];
      detail.innerHTML = `
        <div class="kd-title">${letter} 键 · ${zone.name}第 ${info.pos} 位（区位号 ${info.zone}${info.pos}）· 键名字「${info.keyName}」</div>
        <div class="kd-verse">口诀：${info.verse}</div>
        <div class="kd-roots">${info.roots.map(rootChip).join("")}</div>`;
    }

    Keyboard.render(kbWrap, { onKeyClick: showDetail });
    showDetail("G");

    root.querySelector("#verse-list").innerHTML = Object.entries(keys()).map(([letter, info]) =>
      `<div class="verse-row"><span class="vk">${letter} ${info.keyName}</span><span>${info.verse}</span></div>`
    ).join("");
  }

  // ---- 基础练习 ----
  function rootPool() {
    const pool = [];
    Object.entries(keys()).forEach(([letter, info]) =>
      info.roots.forEach(r => pool.push({ root: r, key: letter })));
    return pool;
  }

  function choiceDrill(area, statsEl, mode) {
    let queue = [];
    let streak = 0;
    let timer = null;
    const modeId = mode;

    function renderStats() {
      const s = Storage.modeStat(modeId);
      const pct = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
      statsEl.innerHTML = `<span>已答：<b>${s.seen}</b></span><span>正确率：<b>${pct}%</b></span>` +
        `<span>连对：<b class="streak">${streak}</b></span><span>最佳连对：<b>${s.best}</b></span>` +
        `<span>已练键位：<b>${Object.keys(Storage.state.rootStats).length}</b>/25</span>`;
    }

    function question() {
      if (!queue.length) queue = Common.shuffle(rootPool());
      const q = queue.pop();
      let options;
      if (mode === "root2key") {
        const others = Common.shuffle(Object.keys(keys()).filter(k => k !== q.key)).slice(0, 3);
        options = Common.shuffle([q.key, ...others]).map(k => ({ value: k, html: `${k}<small>${keys()[k].keyName}</small>` }));
        area.innerHTML = `<div class="prompt-big">${q.root.r}</div>` +
          `<div class="prompt-sub">${q.root.n || "这个字根在哪个键？"}</div>`;
      } else {
        const others = Common.shuffle(rootPool().filter(p => p.key !== q.key)).slice(0, 3);
        options = Common.shuffle([q, ...others]).map(p => ({ value: p.root.r, html: `${p.root.r}${p.root.n ? `<small>${p.root.n}</small>` : ""}` }));
        area.innerHTML = `<div class="prompt-big">${q.key}</div><div class="prompt-sub">键名字「${keys()[q.key].keyName}」，哪个字根在这个键上？</div>`;
      }
      const correct = mode === "root2key" ? q.key : q.root.r;
      const choices = document.createElement("div");
      choices.className = "choices";
      options.forEach(o => {
        const b = document.createElement("button");
        b.className = "choice-btn";
        b.innerHTML = o.html;
        b.addEventListener("click", () => {
          const ok = o.value === correct;
          streak = ok ? streak + 1 : 0;
          Storage.recordRoot(q.key, ok);
          Storage.recordMode(modeId, ok, streak);
          renderStats();
          [...choices.children].forEach((btn, i) => {
            btn.disabled = true;
            if (options[i].value === correct) btn.classList.add("correct");
            else if (btn === b) btn.classList.add("wrong");
          });
          const info = keys()[q.key];
          fb.innerHTML = ok ? "回答正确！" : `正确答案：${correct}　（${q.key} 键口诀：${info.verse}）`;
          fb.className = "feedback " + (ok ? "good" : "bad");
          if (!ok) queue.unshift(q);
          timer = setTimeout(question, ok ? 600 : 1800);
        });
        choices.appendChild(b);
      });
      area.appendChild(choices);
      const fb = document.createElement("div");
      fb.className = "feedback";
      area.appendChild(fb);
    }

    renderStats();
    question();
    return () => clearTimeout(timer);
  }

  function strokeExplain(code) {
    const labels = code.length === 3 ? ["首笔", "次笔"] : ["首笔", "次笔", "末笔"];
    const parts = code.slice(1).split("").map((l, i) =>
      l === "l" ? `补 L` : `${labels[i]}${Common.STROKE[l]} ${l.toUpperCase()}`);
    return `报户口：键名码 ${code[0].toUpperCase()} + ${parts.join(" + ")}`;
  }

  const DRILLS = {
    level1: {
      rule: "一级简码：25 个最常用的字，每个键一个，敲一下该键再按空格就能打出。",
      start: (area, stats) => Common.typedQuiz(area, stats, {
        modeId: "level1",
        pool: WUBI_DATA.level1,
        toQuestion: it => ({ prompt: it.c, answer: it.code, placeholder: "敲一个键",
          explain: `${it.c} 在 ${it.code.toUpperCase()} 键（键名字「${Common.keyName(it.code)}」）` })
      })
    },
    keyname: {
      rule: "键名汉字：每个键左上角的字，所在键连击四下即可打出。",
      start: (area, stats) => Common.typedQuiz(area, stats, {
        modeId: "keyname",
        pool: Object.entries(keys()).map(([k, info]) => ({ c: info.keyName, key: k })),
        toQuestion: it => ({ prompt: it.c, answer: it.key.toLowerCase().repeat(4), placeholder: "连击四下",
          explain: `键名汉字「${it.c}」在 ${it.key} 键，连击四下` })
      })
    },
    chengzi: {
      rule: "键内汉字（成字字根）：字根本身就是一个汉字。编码 = 键名码 + 首笔 + 次笔 + 末笔（笔画码：横 G、竖 H、撇 T、捺 Y、折 N）。只有两笔的字打三码，实际输入时再补一个空格。",
      start: (area, stats) => Common.typedQuiz(area, stats, {
        modeId: "chengzi",
        pool: WUBI_DATA.chengzi,
        toQuestion: it => ({ prompt: it.c, answer: it.code, explain: strokeExplain(it.code) })
      })
    },
    root2key: {
      rule: "看字根，选出它所在的键。答错的字根很快会再出现。",
      start: (area, stats) => choiceDrill(area, stats, "root2key")
    },
    key2root: {
      rule: "看键位，选出属于这个键的字根。",
      start: (area, stats) => choiceDrill(area, stats, "key2root")
    }
  };

  function initDrill(root) {
    const area = root.querySelector("#drill-area");
    const statsEl = root.querySelector("#drill-stats");
    const ruleEl = root.querySelector("#drill-rule");
    const btns = root.querySelectorAll(".mode-btn");
    let cleanup = null;

    function start(mode) {
      if (cleanup) cleanup();
      btns.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
      ruleEl.textContent = DRILLS[mode].rule;
      cleanup = DRILLS[mode].start(area, statsEl);
    }

    btns.forEach(b => b.addEventListener("click", () => start(b.dataset.mode)));
    start("level1");
    return () => cleanup && cleanup();
  }

  return { initChart, initDrill };
})();
