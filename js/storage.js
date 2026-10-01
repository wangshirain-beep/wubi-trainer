// Progress persistence via localStorage.
const Storage = (() => {
  const KEY = "wubi_trainer_progress_v1";

  function defaultState() {
    return {
      rootStats: {},    // key letter -> {seen, correct}
      modeStats: {},    // practice mode id -> {seen, correct, best}
      typingHistory: [], // {date, mode, count, cpm, accuracy}
      gameBest: {}      // game pool id -> best score
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return Object.assign(defaultState(), raw ? JSON.parse(raw) : {});
    } catch (e) {
      return defaultState();
    }
  }

  const state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable */ }
  }

  function recordRoot(keyLetter, correct) {
    const s = state.rootStats[keyLetter] || { seen: 0, correct: 0 };
    s.seen++;
    if (correct) s.correct++;
    state.rootStats[keyLetter] = s;
    save();
  }

  function modeStat(id) {
    return state.modeStats[id] || { seen: 0, correct: 0, best: 0 };
  }

  function recordMode(id, correct, streak) {
    const s = modeStat(id);
    s.seen++;
    if (correct) s.correct++;
    s.best = Math.max(s.best, streak);
    state.modeStats[id] = s;
    save();
  }

  function recordTyping(entry) {
    state.typingHistory.push(entry);
    if (state.typingHistory.length > 50) state.typingHistory.shift();
    save();
  }

  function recordGame(pool, score) {
    const isBest = score > (state.gameBest[pool] || 0);
    if (isBest) state.gameBest[pool] = score;
    save();
    return isBest;
  }

  function rootMasteryPercent() {
    let seen = 0, correct = 0;
    Object.values(state.rootStats).forEach(v => { seen += v.seen; correct += v.correct; });
    return seen ? Math.round((correct / seen) * 100) : 0;
  }

  return { state, recordRoot, modeStat, recordMode, recordTyping, recordGame, rootMasteryPercent };
})();
