// Progress persistence via localStorage.
const Storage = (() => {
  const KEY = "wubi_trainer_progress_v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      rootStats: {},   // key letter -> {seen, correct}
      charStats: { seen: 0, correct: 0 },
      typingHistory: [] // {date, count, cpm, accuracy}
    };
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota errors */ }
  }

  function recordRoot(keyLetter, correct) {
    const s = state.rootStats[keyLetter] || { seen: 0, correct: 0 };
    s.seen++;
    if (correct) s.correct++;
    state.rootStats[keyLetter] = s;
    save();
  }

  function recordChar(correct) {
    state.charStats.seen++;
    if (correct) state.charStats.correct++;
    save();
  }

  function recordTyping(entry) {
    state.typingHistory.push(entry);
    if (state.typingHistory.length > 50) state.typingHistory.shift();
    save();
  }

  function rootMasteryPercent() {
    const keys = Object.keys(state.rootStats);
    if (!keys.length) return 0;
    let seen = 0, correct = 0;
    keys.forEach(k => { seen += state.rootStats[k].seen; correct += state.rootStats[k].correct; });
    return seen ? Math.round((correct / seen) * 100) : 0;
  }

  return { state, save, recordRoot, recordChar, recordTyping, rootMasteryPercent };
})();
