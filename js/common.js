// Shared helpers and the typed-answer quiz used by several practice modes.
const Common = (() => {
  const STROKE = { g: "横", h: "竖", t: "撇", y: "捺(点)", n: "折", l: "补L" };
  const ID_STROKE = ["横", "竖", "撇", "捺", "折"];
  const ID_SHAPE = ["左右", "上下", "杂合"];
  const ID_TABLE = ["gfd", "hjk", "tre", "yui", "nbv"];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function keyName(letter) {
    const info = WUBI_DATA.roots.keys[letter.toUpperCase()];
    return info ? info.keyName : "";
  }

  function codeChips(code) {
    return `<span class="code-letters">${code.toUpperCase().split("").map(l =>
      `<span>${l}<small>${keyName(l)}</small></span>`).join("")}</span>`;
  }

  // Meaning of a last-stroke identification letter, e.g. "y" -> 末笔捺 + 左右结构.
  function idMeaning(letter) {
    for (let s = 0; s < 5; s++) {
      const p = ID_TABLE[s].indexOf(letter);
      if (p >= 0) return { stroke: ID_STROKE[s], shape: ID_SHAPE[p] };
    }
    return null;
  }

  function idTableHtml() {
    const head = ID_SHAPE.map(s => `<th>${s}</th>`).join("");
    const rows = ID_TABLE.map((letters, s) =>
      `<tr><th>末笔${ID_STROKE[s]}</th>${letters.split("").map(l => `<td>${l.toUpperCase()}</td>`).join("")}</tr>`
    ).join("");
    return `<div class="table-wrap"><table class="id-table"><tr><th></th>${head}</tr>${rows}</table></div>`;
  }

  // How many leading codes each character of a word contributes.
  function wordTakes(n) {
    if (n === 1) return [4];
    if (n === 2) return [2, 2];
    if (n === 3) return [1, 1, 2];
    return Array.from({ length: n }, (_, i) => (i < 3 || i === n - 1 ? 1 : 0));
  }

  const WORD_RULES = {
    1: "单字：有简码用简码（一级 1 码、二级 2 码、三级 3 码），否则打全码；最多 4 码。",
    2: "二字词：每个字各取前两码，共 4 码。",
    3: "三字词：第一、二字各取第一码，第三字取前两码，共 4 码。",
    4: "四字词语（含成语）：每个字各取第一码，共 4 码。",
    5: "多字词：取第一、二、三字和最后一个字的第一码，共 4 码。"
  };

  function wordBreakdown(word) {
    const chars = [...word];
    const takes = wordTakes(chars.length);
    const parts = chars.map((ch, i) => {
      const full = WUBI_DATA.charFull[ch] || "";
      const n = takes[i];
      return `<span class="bd-char${n ? "" : " dim"}">${ch}<span class="bd-code"><b>${full.slice(0, n)}</b>${full.slice(n)}</span></span>`;
    });
    return parts.join("");
  }

  // Typed quiz: shows a prompt, the learner types the code.
  function typedQuiz(area, statsEl, opts) {
    const { modeId, pool, autoSubmit = true } = opts;
    let retry = [];
    let count = 0;
    let streak = 0;
    let timer = null;

    function renderStats() {
      const s = Storage.modeStat(modeId);
      const pct = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
      statsEl.innerHTML = `<span>已答：<b>${s.seen}</b></span><span>正确率：<b>${pct}%</b></span>` +
        `<span>连对：<b class="streak">${streak}</b></span><span>最佳连对：<b>${s.best}</b></span>`;
    }

    function pick() {
      count++;
      if (retry.length && retry[0].due <= count) return retry.shift().item;
      return randomItem(pool);
    }

    function next() {
      clearTimeout(timer);
      const item = pick();
      const q = opts.toQuestion(item);
      area.innerHTML = `
        <div class="type-card">
          <div class="${q.cls || "ch"}">${q.prompt}</div>
          ${q.sub ? `<div class="prompt-sub">${q.sub}</div>` : ""}
          <input class="type-input" id="tq-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.placeholder || "输入编码"}">
          <div class="answer-detail" id="tq-answer"></div>
        </div>`;
      const input = area.querySelector("#tq-input");
      input.focus();
      let done = false;
      const check = () => {
        if (done) return;
        done = true;
        answer(item, q, input.value.trim().toLowerCase(), input);
      };
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-zA-Z]/g, "");
        if (autoSubmit && input.value.length >= q.answer.length) check();
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (done) next(); else if (input.value) check();
        }
      });
    }

    function answer(item, q, value, input) {
      const ok = (q.accept || [q.answer]).includes(value);
      streak = ok ? streak + 1 : 0;
      Storage.recordMode(modeId, ok, streak);
      if (opts.onAnswer) opts.onAnswer(item, ok);
      renderStats();
      input.classList.add(ok ? "correct" : "wrong");
      input.readOnly = true;
      const detail = area.querySelector("#tq-answer");
      detail.innerHTML = `<div class="${ok ? "good" : "bad"}">${ok ? "✔ 正确" : "✘ 正确编码"}：${codeChips(q.answer)}</div>` +
        (q.explain ? `<div class="explain">${q.explain}</div>` : "") +
        (ok ? "" : `<div class="hint">按回车继续</div>`);
      if (ok) {
        timer = setTimeout(next, q.explain ? 1100 : 600);
      } else {
        retry.push({ item, due: count + 3 });
      }
    }

    renderStats();
    next();
    return () => clearTimeout(timer);
  }

  return { shuffle, randomItem, keyName, codeChips, idMeaning, idTableHtml, wordTakes,
    WORD_RULES, wordBreakdown, typedQuiz, STROKE };
})();
