// "字根表" (root chart) view and "字根练习" (root drill) view.
const RootsView = (() => {
  function initChart(root) {
    const kbWrap = root.querySelector("#kb-wrap");
    const detail = root.querySelector("#kb-detail");
    const verseList = root.querySelector("#verse-list");

    function showDetail(letter) {
      const info = WUBI_DATA.roots.keys[letter];
      Keyboard.render(kbWrap, { onKeyClick: showDetail, selected: letter });
      if (!info) { detail.innerHTML = ""; return; }
      detail.innerHTML = `
        <div class="kd-title">${letter} 键 · 键名字「${info.keyName}」</div>
        <div class="kd-verse">口诀：${info.verse}</div>
        <div class="kd-roots">${info.roots.map(r => `<span>${r}</span>`).join("")}</div>
      `;
    }

    Keyboard.render(kbWrap, { onKeyClick: showDetail });
    detail.innerHTML = `<span class="hint">点击上方按键查看详情</span>`;

    verseList.innerHTML = Keyboard.allKeyLetters().map(letter => {
      const info = WUBI_DATA.roots.keys[letter];
      return `<div class="verse-row"><span class="vk">${letter}(${info.keyName})</span><span>${info.verse}</span></div>`;
    }).join("");
  }

  // ---- Drill ----
  let mode = "root2key";
  let queue = [];
  let current = null;

  function buildRootPool() {
    const pool = [];
    Keyboard.allKeyLetters().forEach(letter => {
      WUBI_DATA.roots.keys[letter].roots.forEach(rootChar => {
        pool.push({ root: rootChar, key: letter });
      });
    });
    return pool;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextQuestion() {
    if (queue.length === 0) queue = shuffle(buildRootPool());
    current = queue.pop();
    return current;
  }

  function pickDistractors(correctValue, allValues, n) {
    const others = [...new Set(allValues)].filter(v => v !== correctValue);
    return shuffle(others).slice(0, n);
  }

  function renderStats(container) {
    const pct = Storage.rootMasteryPercent();
    const seenKeys = Object.keys(Storage.state.rootStats).length;
    container.innerHTML = `<span>累计正确率：<b>${pct}%</b></span><span>已练习键位数：<b>${seenKeys}</b>/25</span>`;
  }

  function initDrill(root) {
    const area = root.querySelector("#drill-area");
    const statsEl = root.querySelector("#drill-stats");
    const modeBtns = root.querySelectorAll(".mode-btn");

    modeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        modeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        mode = btn.dataset.mode;
        queue = [];
        renderQuestion();
      });
    });

    function renderQuestion() {
      renderStats(statsEl);
      const q = nextQuestion();
      area.innerHTML = "";

      if (mode === "root2key") {
        const prompt = document.createElement("div");
        prompt.className = "prompt-big";
        prompt.textContent = q.root;
        area.appendChild(prompt);

        const allKeys = Keyboard.allKeyLetters();
        const distractors = pickDistractors(q.key, allKeys, 3);
        const options = shuffle([q.key, ...distractors]);

        const choices = document.createElement("div");
        choices.className = "choices";
        options.forEach(letter => {
          const b = document.createElement("button");
          b.className = "choice-btn";
          b.textContent = `${letter} (${WUBI_DATA.roots.keys[letter].keyName})`;
          b.addEventListener("click", () => answer(letter, q.key, b, choices));
          choices.appendChild(b);
        });
        area.appendChild(choices);
      } else {
        const prompt = document.createElement("div");
        prompt.className = "prompt-big";
        prompt.style.fontSize = "40px";
        prompt.textContent = `${q.key} 键 (${WUBI_DATA.roots.keys[q.key].keyName})`;
        area.appendChild(prompt);

        const allRoots = buildRootPool().filter(p => p.key !== q.key).map(p => p.root);
        const distractors = pickDistractors(q.root, allRoots, 3);
        const options = shuffle([q.root, ...distractors]);

        const choices = document.createElement("div");
        choices.className = "choices";
        options.forEach(rootChar => {
          const b = document.createElement("button");
          b.className = "choice-btn";
          b.textContent = rootChar;
          b.addEventListener("click", () => answer(rootChar, q.root, b, choices));
          choices.appendChild(b);
        });
        area.appendChild(choices);
      }

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.id = "drill-feedback";
      area.appendChild(feedback);
    }

    function answer(chosen, correct, btnEl, choicesEl) {
      const isCorrect = chosen === correct;
      Storage.recordRoot(current.key, isCorrect);
      renderStats(statsEl);
      [...choicesEl.children].forEach(b => {
        b.disabled = true;
        const label = mode === "root2key" ? b.textContent.split(" ")[0] : b.textContent;
        if (label === correct) b.classList.add("correct");
        else if (b === btnEl) b.classList.add("wrong");
      });
      const fb = document.getElementById("drill-feedback");
      fb.textContent = isCorrect ? "回答正确！" : `回答错误，正确答案：${correct}`;
      fb.className = "feedback " + (isCorrect ? "good" : "bad");
      if (!isCorrect) queue.unshift(current); // requeue for reinforcement
      setTimeout(renderQuestion, 700);
    }

    renderQuestion();
  }

  return { initChart, initDrill };
})();
