// "拆字练习" (decomposition) and "打字练习" (typing) views.
const TypingView = (() => {
  // ---------- 拆字练习 ----------
  const DECOMPOSE = {
    common: {
      rule: () => "常用字：输入完整编码（取大优先：按书写顺序，每次取尽可能大的字根；超过四个字根取一、二、三、末字根）。也可以输入简码，回车提交。",
      pool: () => WUBI_DATA.chars.slice(0, 2000),
      question: it => ({ prompt: it.c, answer: it.full, accept: it.codes,
        explain: it.short !== it.full ? `可用简码：<b>${it.short}</b>` : "" }),
      autoSubmit: true
    },
    idcode: {
      rule: () => "末笔识别码字：只有两个字根的字，编码 = 两个字根 + 识别码。识别码 = 末笔笔画（区号）+ 字型结构（位号），查下表：" + Common.idTableHtml(),
      pool: () => WUBI_DATA.idChars,
      question: it => {
        const m = Common.idMeaning(it.code[2]);
        return { prompt: it.c, answer: it.code,
          explain: `前两码 <b>${it.code.slice(0, 2).toUpperCase()}</b> 是两个字根；识别码 <b>${it.code[2].toUpperCase()}</b> = 末笔「${m.stroke}」+「${m.shape}」结构` };
      },
      autoSubmit: true
    },
    hard: {
      rule: () => "难拆字：书写顺序和字根取法容易出错的字。先在心里拆，再输入完整编码；答错的字会很快再出现。",
      pool: () => WUBI_DATA.hard,
      question: it => ({ prompt: it.c, answer: it.code }),
      autoSubmit: true
    }
  };

  function initDecompose(root) {
    const area = root.querySelector("#decompose-area");
    const statsEl = root.querySelector("#decompose-stats");
    const ruleEl = root.querySelector("#decompose-rule");
    const btns = root.querySelectorAll(".mode-btn");
    let cleanup = null;

    function start(mode) {
      if (cleanup) cleanup();
      btns.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
      const m = DECOMPOSE[mode];
      ruleEl.innerHTML = m.rule();
      cleanup = Common.typedQuiz(area, statsEl, {
        modeId: "decompose-" + mode, pool: m.pool(), toQuestion: m.question, autoSubmit: m.autoSubmit
      });
    }

    btns.forEach(b => b.addEventListener("click", () => start(b.dataset.mode)));
    start("common");
    return () => cleanup && cleanup();
  }

  // ---------- 打字练习 ----------
  function initTyping(root) {
    const area = root.querySelector("#typing-area");
    const statsEl = root.querySelector("#typing-stats");
    const ruleEl = root.querySelector("#typing-rule");
    const lengthSel = root.querySelector("#typing-length");
    const hintChk = root.querySelector("#typing-hint");
    const btns = root.querySelectorAll(".mode-btn");

    let cat = "1";
    let items = [];
    let idx = 0;
    let startTime = null;
    let correctCount = 0;
    let totalCodeChars = 0;

    function buildItems(count) {
      if (cat === "1") {
        const chars = WUBI_DATA.chars.slice(0, 1500);
        return Array.from({ length: count }, () => {
          const c = Common.randomItem(chars);
          return { text: c.c, code: c.short, accept: c.codes };
        });
      }
      const list = WUBI_DATA.words[cat];
      const top = list.slice(0, Math.min(list.length, cat === "2" ? 1500 : 800));
      return Array.from({ length: count }, () => {
        const w = Common.randomItem(top);
        return { text: w.w, code: w.code, accept: [w.code] };
      });
    }

    function breakdownHtml(it) {
      if (cat === "1") {
        const full = WUBI_DATA.charFull[it.text] || it.code;
        return `<span class="bd-char">${it.text}<span class="bd-code">全码 <b>${full}</b>${it.code !== full ? `　简码 <b>${it.code}</b>` : ""}</span></span>`;
      }
      return Common.wordBreakdown(it.text) + `<span class="bd-result">→ <b>${it.code}</b></span>`;
    }

    function renderStream() {
      area.querySelector("#ts-stream").innerHTML = items.map((it, i) => {
        let cls = "item";
        if (i === idx) cls += " current";
        else if (it.status === "ok") cls += " done-ok";
        else if (it.status === "bad") cls += " done-bad";
        return `<span class="${cls}">${it.text}</span>`;
      }).join("");
    }

    function renderCurrent() {
      const it = items[idx];
      area.querySelector("#ts-current").textContent = it.text;
      area.querySelector("#ts-hint").innerHTML = hintChk.checked ? breakdownHtml(it) : "";
    }

    function renderLiveStats() {
      statsEl.innerHTML = `<span>进度：<b>${idx}</b>/${items.length}</span><span>正确：<b>${correctCount}</b></span>`;
    }

    function start() {
      items = buildItems(parseInt(lengthSel.value, 10));
      idx = 0; startTime = null; correctCount = 0; totalCodeChars = 0;
      area.innerHTML = `
        <div class="typing-stream" id="ts-stream"></div>
        <div class="type-card">
          <div class="${cat === "1" ? "ch" : "word"}" id="ts-current"></div>
          <div class="breakdown" id="ts-hint"></div>
          <input class="type-input" id="ts-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入编码，空格确认">
          <div class="breakdown feedback-line" id="ts-feedback"></div>
        </div>`;
      renderStream();
      renderCurrent();
      renderLiveStats();
      const input = area.querySelector("#ts-input");
      input.focus();
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-zA-Z]/g, "");
        if (input.value.length >= 4) { submit(input.value.toLowerCase()); input.value = ""; }
      });
      input.addEventListener("keydown", e => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (input.value) { submit(input.value.trim().toLowerCase()); input.value = ""; }
        }
      });
    }

    function submit(value) {
      if (startTime === null) startTime = Date.now();
      const it = items[idx];
      const ok = it.accept.includes(value);
      it.status = ok ? "ok" : "bad";
      if (ok) correctCount++;
      totalCodeChars += it.code.length;
      const fb = area.querySelector("#ts-feedback");
      fb.innerHTML = ok ? "" : `<span class="bad">✘ 你输入了 ${value}</span>　${breakdownHtml(it)}`;
      idx++;
      if (idx >= items.length) return finish();
      renderStream();
      renderCurrent();
      renderLiveStats();
    }

    function finish() {
      const elapsedMin = Math.max((Date.now() - startTime) / 60000, 1 / 60);
      const cpm = Math.round(totalCodeChars / elapsedMin);
      const wpm = Math.round(items.length / elapsedMin);
      const accuracy = Math.round((correctCount / items.length) * 100);
      const stars = accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : accuracy >= 70 ? 1 : 0;
      Storage.recordTyping({ date: new Date().toISOString(), mode: cat, count: items.length, cpm, accuracy });
      const wrong = items.filter(it => it.status === "bad");
      area.innerHTML = `
        <div class="result-card">
          <div class="stars">${"★".repeat(stars)}<span class="off">${"★".repeat(3 - stars)}</span></div>
          <div class="result-nums">
            <div><div class="big-num">${wpm}</div><div>${cat === "1" ? "字" : "词"}/分钟</div></div>
            <div><div class="big-num">${cpm}</div><div>码/分钟</div></div>
            <div><div class="big-num">${accuracy}%</div><div>正确率</div></div>
          </div>
          ${wrong.length ? `<div class="wrong-list"><div class="hint">本轮打错的，记一下：</div>${wrong.map(it => `<div class="breakdown">${breakdownHtml(it)}</div>`).join("")}</div>` : ""}
          <button class="btn" id="ts-again">再来一轮</button>
        </div>`;
      area.querySelector("#ts-again").addEventListener("click", start);
      renderLiveStats();
    }

    function setCat(c) {
      cat = c;
      btns.forEach(b => b.classList.toggle("active", b.dataset.mode === c));
      ruleEl.textContent = Common.WORD_RULES[c];
      start();
    }

    btns.forEach(b => b.addEventListener("click", () => setCat(b.dataset.mode)));
    root.querySelector("#typing-start").addEventListener("click", start);
    hintChk.addEventListener("change", () => { if (idx < items.length && area.querySelector("#ts-hint")) renderCurrent(); });
    setCat("1");
  }

  return { initDecompose, initTyping };
})();
