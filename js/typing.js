// "拆字练习" (character decomposition) and "打字练习" (typing speed) views.
const TypingView = (() => {
  function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function letterChips(code, includeKeyName) {
    return code.toUpperCase().split("").map(l => {
      const info = WUBI_DATA.roots.keys[l];
      const kn = info ? info.keyName : "";
      return `<span>${l}${includeKeyName && kn ? " " + kn : ""}</span>`;
    }).join("");
  }

  // ---------- 拆字练习 (decomposition) ----------
  function initDecompose(root) {
    const area = root.querySelector("#decompose-area");
    const statsEl = root.querySelector("#decompose-stats");
    const pool = WUBI_DATA.chars.slice(0, 2000);
    let current = null;

    function renderStats() {
      const s = Storage.state.charStats;
      const pct = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
      statsEl.innerHTML = `<span>已练习：<b>${s.seen}</b></span><span>正确率：<b>${pct}%</b></span>`;
    }

    function next() {
      current = randomItem(pool);
      area.innerHTML = `
        <div class="type-card">
          <div class="ch">${current.c}</div>
          <input class="type-input" id="dc-input" autocomplete="off" autocapitalize="off" placeholder="输入编码后回车">
          <div class="answer-detail" id="dc-answer"></div>
        </div>
      `;
      const input = area.querySelector("#dc-input");
      input.focus();
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") checkAnswer(input.value.trim().toLowerCase());
      });
    }

    function checkAnswer(value) {
      const input = area.querySelector("#dc-input");
      const answerEl = area.querySelector("#dc-answer");
      const isCorrect = current.codes.includes(value);
      input.classList.add(isCorrect ? "correct" : "wrong");
      input.disabled = true;
      Storage.recordChar(isCorrect);
      renderStats();
      answerEl.innerHTML = `
        <div>${isCorrect ? "✔ 正确" : "✘ 完整编码"}：<span class="code-letters">${letterChips(current.full, true)}</span></div>
        ${current.short !== current.full ? `<div style="margin-top:4px">可用简码：<b>${current.short}</b></div>` : ""}
        <button class="btn" id="dc-next" style="margin-top:12px">下一个</button>
      `;
      area.querySelector("#dc-next").addEventListener("click", next);
    }

    renderStats();
    next();
  }

  // ---------- 打字练习 (typing speed) ----------
  function initTyping(root) {
    const area = root.querySelector("#typing-area");
    const statsEl = root.querySelector("#typing-stats");
    const lengthSel = root.querySelector("#typing-length");
    const contentSel = root.querySelector("#typing-content");
    const startBtn = root.querySelector("#typing-start");

    let items = [];
    let idx = 0;
    let startTime = null;
    let correctCount = 0;
    let totalCodeChars = 0;

    function buildItems(count, contentType) {
      const chars = WUBI_DATA.chars.slice(0, 1500);
      const words = WUBI_DATA.words.slice(0, 2000);
      const list = [];
      for (let i = 0; i < count; i++) {
        let useWord;
        if (contentType === "char") useWord = false;
        else if (contentType === "word") useWord = true;
        else useWord = Math.random() < 0.5;
        if (useWord) {
          const w = randomItem(words);
          list.push({ text: w.w, code: w.code });
        } else {
          const c = randomItem(chars);
          list.push({ text: c.c, code: c.short });
        }
      }
      return list;
    }

    function renderStream() {
      const html = items.map((it, i) => {
        let cls = "item";
        if (i === idx) cls += " current";
        else if (it.status === "ok") cls += " done-ok";
        else if (it.status === "bad") cls += " done-bad";
        return `<span class="${cls}">${it.text}</span>`;
      }).join("");
      area.querySelector("#ts-stream").innerHTML = html;
    }

    function renderLiveStats() {
      statsEl.innerHTML = `<span>进度：<b>${idx}</b>/${items.length}</span><span>正确：<b>${correctCount}</b></span>`;
    }

    function start() {
      const count = parseInt(lengthSel.value, 10);
      const contentType = contentSel.value;
      items = buildItems(count, contentType);
      idx = 0; startTime = null; correctCount = 0; totalCodeChars = 0;
      area.innerHTML = `
        <div class="typing-stream" id="ts-stream"></div>
        <div class="type-card">
          <div class="word" id="ts-current">${items[0].text}</div>
          <input class="type-input" id="ts-input" autocomplete="off" autocapitalize="off" placeholder="输入编码，空格/回车确认">
        </div>
      `;
      renderStream();
      renderLiveStats();
      const input = area.querySelector("#ts-input");
      input.focus();
      input.addEventListener("keydown", e => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          submit(input.value.trim().toLowerCase());
          input.value = "";
        }
      });
    }

    function submit(value) {
      if (startTime === null) startTime = Date.now();
      const it = items[idx];
      const isCorrect = value === it.code;
      it.status = isCorrect ? "ok" : "bad";
      if (isCorrect) correctCount++;
      totalCodeChars += it.code.length;
      idx++;
      if (idx >= items.length) {
        finish();
        return;
      }
      area.querySelector("#ts-current").textContent = items[idx].text;
      renderStream();
      renderLiveStats();
    }

    function finish() {
      const elapsedMin = Math.max((Date.now() - startTime) / 60000, 1 / 60);
      const cpm = Math.round(totalCodeChars / elapsedMin);
      const accuracy = Math.round((correctCount / items.length) * 100);
      Storage.recordTyping({ date: new Date().toISOString(), count: items.length, cpm, accuracy });
      area.innerHTML = `
        <div class="result-card">
          <div>本轮打字速度</div>
          <div class="big-num">${cpm}</div>
          <div>码/分钟 (CPM)</div>
          <div style="margin-top:16px">正确率：<b>${accuracy}%</b>　共 ${items.length} 项</div>
          <button class="btn" id="ts-again" style="margin-top:16px">再来一轮</button>
        </div>
      `;
      area.querySelector("#ts-again").addEventListener("click", start);
      renderLiveStats();
    }

    startBtn.addEventListener("click", start);
    start();
  }

  return { initDecompose, initTyping };
})();
