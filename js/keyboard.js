// Keyboard rendering shared by the root-chart view and the drill view.
const Keyboard = (() => {
  const ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];

  const ZONE_COLOR = { 1: "zone1", 2: "zone2", 3: "zone3", 4: "zone4", 5: "zone5" };

  function zoneOf(letter) {
    const info = WUBI_DATA.roots.keys[letter];
    return info ? info.zone : null;
  }

  function render(container, { onKeyClick, selected } = {}) {
    container.innerHTML = "";
    ROWS.forEach((row, i) => {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row row" + (i + 1);
      row.forEach(letter => {
        const info = WUBI_DATA.roots.keys[letter];
        const btn = document.createElement("button");
        btn.className = "key " + (info ? "zone" + info.zone : "zone-none");
        if (info) btn.style.background = `var(--${ZONE_COLOR[info.zone]})`;
        if (letter === selected) btn.classList.add("selected");
        btn.innerHTML = `<div class="letter">${letter}</div>` +
          (info ? `<div class="keyname">${info.keyName}</div>` : `<div class="keyname">–</div>`);
        btn.addEventListener("click", () => onKeyClick && onKeyClick(letter));
        rowEl.appendChild(btn);
      });
      container.appendChild(rowEl);
    });
  }

  function allKeyLetters() {
    return Object.keys(WUBI_DATA.roots.keys);
  }

  return { render, zoneOf, allKeyLetters, ZONE_COLOR };
})();
