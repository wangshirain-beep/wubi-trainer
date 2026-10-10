// "查码" view: find a character by pinyin (or type it), show its code and why.
const LookupView = (() => {
  const TONES = { "ā": "a1", "á": "a2", "ǎ": "a3", "à": "a4", "ē": "e1", "é": "e2", "ě": "e3", "è": "e4",
    "ī": "i1", "í": "i2", "ǐ": "i3", "ì": "i4", "ō": "o1", "ó": "o2", "ǒ": "o3", "ò": "o4",
    "ū": "u1", "ú": "u2", "ǔ": "u3", "ù": "u4", "ǖ": "v1", "ǘ": "v2", "ǚ": "v3", "ǜ": "v4", "ü": "v0",
    "ń": "n2", "ň": "n3", "ǹ": "n4", "ḿ": "m2" };
  const SHORT_NAMES = { 1: "一级简码", 2: "二级简码", 3: "三级简码" };
  let pinyinIndex = null;
  let rootInfo = null;

  // "nǐ" -> {syl: "ni", tone: 3}
  function splitTone(py) {
    let tone = 0, syl = "";
    for (const ch of py.toLowerCase()) {
      const t = TONES[ch];
      if (t) { syl += t[0]; if (t[1] !== "0") tone = +t[1]; } else syl += ch;
    }
    const m = syl.match(/^([a-z]+)([1-5])$/);
    if (m) { syl = m[1]; tone = +m[2]; }
    return { syl: syl.replace(/u:/g, "v"), tone };
  }

  function buildIndexes() {
    if (pinyinIndex) return;
    pinyinIndex = new Map();
    for (const [ch, e] of Object.entries(WUBI_LOOKUP)) {
      for (const py of (e[1] || "").split(" ").filter(Boolean)) {
        const { syl, tone } = splitTone(py);
        if (!pinyinIndex.has(syl)) pinyinIndex.set(syl, []);
        const list = pinyinIndex.get(syl);
        const found = list.find(x => x.ch === ch);
        if (found) found.tones.add(tone); else list.push({ ch, tones: new Set([tone]) });
      }
    }
    rootInfo = {};
    for (const [letter, k] of Object.entries(WUBI_DATA.roots.keys)) {
      rootInfo[k.keyName] = { key: letter, note: "键名汉字" };
      k.roots.forEach(r => { rootInfo[r.r] = { key: letter, note: r.n || "" }; });
    }
  }

  function findByPinyin(input) {
    const { syl, tone } = splitTone(input.trim());
    let syls = [syl];
    if (!pinyinIndex.has(syl)) syls = [...pinyinIndex.keys()].filter(s => s.startsWith(syl)).sort().slice(0, 6);
    const out = [];
    syls.forEach(s => (pinyinIndex.get(s) || []).forEach(x => {
      if (!tone || x.tones.has(tone)) out.push(x.ch);
    }));
    return { chars: [...new Set(out)], syls, exact: pinyinIndex.has(syl) };
  }

  function codeChips(code) { return Common.codeChips(code); }

  function rootChip(glyph, taken) {
    const info = rootInfo[glyph] || { key: "?", note: "" };
    return `<span class="lk-root${taken ? "" : " skipped"}"><span class="glyph">${glyph}</span>` +
      `<b>${info.key}</b>${info.note ? `<small>${info.note}</small>` : ""}</span>`;
  }

  function idExplain(letter, n) {
    const m = Common.idMeaning(letter);
    const zone = "gfdhjktreyuinbv".indexOf(letter);
    const z = Math.floor(zone / 3) + 1, p = (zone % 3) + 1;
    return `只有 ${n} 个字根，不足四码，要补一个<b>末笔识别码</b>：最后一笔是「${m.stroke}」（第 ${z} 区），` +
      `字型是「${m.shape}」结构（第 ${p} 位），${z}区${p}位就是 <b>${letter.toUpperCase()}</b> 键。` +
      (n === 2 ? "加上识别码只有三码，实际打字时再按一下空格。" : "");
  }

  function shortCodesHtml(codes) {
    const full = codes[codes.length - 1];
    const shorts = codes.filter(c => c.length < full.length);
    if (!shorts.length) return "";
    return `<div class="lk-short">常用字可用简码，打完按空格即可：` +
      shorts.map(c => `<b>${c.toUpperCase()}</b>（${SHORT_NAMES[c.length]}）`).join("、") + "</div>";
  }

  function explainHtml(ch) {
    const e = WUBI_LOOKUP[ch];
    if (!e) return `<div class="lk-card"><div class="lk-char">${ch}</div><p class="hint">没有找到这个字的五笔编码（只收录 GB2312 里的 6763 个简体字）。</p></div>`;
    const codes = e[0].split(" ");
    const full = codes[codes.length - 1];
    const [, pinyin, type, rootsStr, id] = e;
    const roots = rootsStr ? rootsStr.split(" ") : [];
    let body = "";

    if (type === "keyname") {
      const k = full[0].toUpperCase();
      body = `<p>「${ch}」是 <b>${k}</b> 键的<b>键名汉字</b>（键位左上角的字）。规则：键名汉字连击四下所在键。</p>`;
    } else if (type === "chengzi") {
      const parts = full.slice(1).split("").map((l, i) => l === "l"
        ? `补 L`
        : `${["首笔", "次笔", "末笔"][i]}「${Common.STROKE[l]}」→ ${l.toUpperCase()}`);
      body = `<p>「${ch}」本身就是 <b>${full[0].toUpperCase()}</b> 键上的一个字根，叫<b>成字字根</b>（键内汉字）。</p>` +
        `<p>规则「报户口」：先打所在键，再打首笔、次笔、末笔的笔画码（横 G、竖 H、撇 T、捺 Y、折 N）。</p>` +
        `<div class="lk-roots">${rootChip(ch, true)}</div>` +
        `<p>键名码 ${full[0].toUpperCase()} → ${parts.join(" → ")}` +
        (full.includes("l") ? "（单笔画字根只有一笔，打两下所在键后补两个 L）" : "") +
        (full.length === 3 ? "（只有两笔，打三码后再按空格）" : "") + "</p>";
    } else if (type === "split") {
      const n = roots.length;
      const takes = roots.map((_, i) => n <= 4 || i < 3 || i === n - 1);
      body = `<p>按书写顺序拆成 <b>${n}</b> 个字根（取大优先：每一步都取尽可能大的字根）：</p>` +
        `<div class="lk-roots">${roots.map((g, i) => rootChip(g, takes[i])).join("")}</div>` +
        (n > 4 ? `<p>超过 4 个字根，只取<b>第一、二、三和最后一个</b>字根（灰色的不取码）。</p>`
          : n === 4 ? `<p>正好 4 个字根，依次取每个字根所在的键。</p>`
            : `<p>${idExplain(id, n)}</p>`);
    } else {
      body = `<p class="hint">这个字暂时没有自动拆分，下面按编码列出每一码所在的键。</p>` +
        (full.length === 3 ? `<p>三码字一般是两个字根加末笔识别码：第三码 ${full[2].toUpperCase()}` +
          (Common.idMeaning(full[2]) ? ` 表示最后一笔「${Common.idMeaning(full[2]).stroke}」、「${Common.idMeaning(full[2]).shape}」结构。` : "。") + "</p>"
          : `<p>四码字可能是四个以上字根（取一、二、三、末），也可能是三个字根加末笔识别码。</p>`) +
        `<ul class="lk-letters">${full.split("").map((l, i) => {
          const k = WUBI_DATA.roots.keys[l.toUpperCase()];
          return `<li>第 ${i + 1} 码 <b>${l.toUpperCase()}</b>（${k.keyName}）：${k.roots.map(r => r.r).join(" ")}</li>`;
        }).join("")}</ul>` +
        `<p class="hint">对照上面每个键的字根，按书写顺序找出这个字由哪些字根组成。</p>`;
    }

    return `<div class="lk-card">
      <div class="lk-head">
        <div class="lk-char">${ch}</div>
        <div class="lk-meta">
          <div class="hint">${pinyin}</div>
          <div>完整编码：${codeChips(full)}</div>
        </div>
      </div>
      ${body}
      ${shortCodesHtml(codes)}
    </div>`;
  }

  function wordHtml(text) {
    const chars = [...text];
    if (chars.some(c => !WUBI_LOOKUP[c])) return "";
    const fulls = chars.map(c => WUBI_LOOKUP[c][0].split(" ").pop());
    const takes = Common.wordTakes(chars.length);
    const code = fulls.map((f, i) => f.slice(0, takes[i])).join("");
    const parts = chars.map((c, i) =>
      `<span class="bd-char${takes[i] ? "" : " dim"}">${c}<span class="bd-code"><b>${fulls[i].slice(0, takes[i])}</b>${fulls[i].slice(takes[i])}</span></span>`).join("");
    return `<div class="lk-card"><h3>词组「${text}」的编码</h3>
      <p>${Common.WORD_RULES[Math.min(chars.length, 5)]}</p>
      <div class="breakdown">${parts}<span class="bd-result">→ <b>${code}</b></span></div>
      <p class="hint">这是按词组取码规则算出的编码；输入法词库里没有收录的词，打出来可能需要单字输入。</p></div>`;
  }

  function wildcard(pattern) {
    const re = new RegExp("^" + pattern.replace(/z/g, "[a-y]") + "$");
    const out = [];
    for (const [ch, e] of Object.entries(WUBI_LOOKUP)) {
      const hit = e[0].split(" ").find(c => re.test(c));
      if (hit) out.push({ ch, code: hit });
      if (out.length >= 80) break;
    }
    return out;
  }

  function init(root) {
    buildIndexes();
    const input = root.querySelector("#lk-input");
    const cands = root.querySelector("#lk-cands");
    const result = root.querySelector("#lk-result");
    const zInput = root.querySelector("#lk-z");
    const zResult = root.querySelector("#lk-z-result");

    function show(ch) {
      cands.querySelectorAll(".lk-cand").forEach(b => b.classList.toggle("active", b.dataset.ch === ch));
      result.innerHTML = explainHtml(ch);
    }

    function candButtons(list) {
      return list.map(ch => `<button class="lk-cand" data-ch="${ch}">${ch}</button>`).join("");
    }

    function run() {
      const v = input.value.trim();
      cands.innerHTML = ""; result.innerHTML = "";
      if (!v) return;
      const han = [...v].filter(c => /\p{Script=Han}/u.test(c));
      if (han.length) {
        const text = han.slice(0, 8).join("");
        result.innerHTML = (han.length > 1 ? wordHtml(text) : "") + [...text].map(explainHtml).join("");
        return;
      }
      if (!/^[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ:]+[1-5]?$/.test(v)) {
        cands.innerHTML = `<p class="hint">请输入一个音节的拼音，例如 ni、ni3、lv，或者直接输入汉字。</p>`;
        return;
      }
      const { chars, syls, exact } = findByPinyin(v);
      if (!chars.length) {
        cands.innerHTML = `<p class="hint">没有找到拼音「${v}」的字。ü 可以用 v 代替，例如 lv、nv。</p>`;
        return;
      }
      cands.innerHTML = (exact ? "" : `<p class="hint">没有完全匹配的音节，显示 ${syls.join("、")} 的字：</p>`) +
        `<div class="lk-cands">${candButtons(chars.slice(0, 120))}</div>`;
      show(chars[0]);
    }

    cands.addEventListener("click", e => {
      const b = e.target.closest(".lk-cand");
      if (b) show(b.dataset.ch);
    });
    input.addEventListener("input", run);

    zInput.addEventListener("input", () => {
      const v = zInput.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4);
      zInput.value = v;
      if (!v) { zResult.innerHTML = ""; return; }
      if (!v.includes("z")) { zResult.innerHTML = `<p class="hint">在不确定的那一码位置打 Z，例如 wziy。</p>`; return; }
      const hits = wildcard(v);
      zResult.innerHTML = hits.length
        ? `<div class="lk-cands">${hits.map(h => `<button class="lk-cand" data-ch="${h.ch}" title="${h.code}">${h.ch}<small>${h.code}</small></button>`).join("")}</div>`
        : `<p class="hint">没有匹配的字。</p>`;
    });
    zResult.addEventListener("click", e => {
      const b = e.target.closest(".lk-cand");
      if (b) { input.value = b.dataset.ch; run(); input.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });

    input.value = "ni";
    run();
    input.focus();
  }

  return { init };
})();
