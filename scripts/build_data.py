#!/usr/bin/env python3
"""Build js/data.js for the wubi trainer from a Rime wubi86 dictionary file
and data/roots.json.

Source dictionary: https://github.com/rime/rime-wubi (wubi86.dict.yaml, LGPLv3).
That project compiles the standard, publicly documented 86-version Wubi
encoding rules (Wang Yongmin) into a Rime input-method dictionary; we only
reuse the resulting character/word -> code table here.

Usage:
    python3 scripts/build_data.py /path/to/wubi86.dict.yaml
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TOP_CHARS = 3500
WORD_LIMITS = {2: 3000, 3: 1500, 4: 1500, 5: 500}  # 5 = five or more characters
ID_CHARS = 600
STROKE_LETTERS = set("ghtynl")
ID_LETTERS = set("gfdhjktreyuinbv")

# Characters commonly cited as hard to decompose in 86 Wubi.
HARD_CHARS = (
    "凸凹鼎噩爽曳臧戊戌戍成我身乘必及母毋册甩卵断兜黄末未夷出再丹年鬼舞剩承函乖垂夜北乐"
    "发飞尴尬肃事秉敖叟果里万方为片牙世甚予互臣丈尤求非兆卑曲彝黎象鼠齿豫柬束禹重疆养着"
    "差美拜齐冉敝乏丐亏史威咸匆那修傲卿衡嬴赢搜焉鸟乌兔免爪瓜印卯丢允能段民虚皮步骨曾遥"
    "长肖罗衰舟包食仓久秋物斗春寿奉弟第巡贯乡每争角危色录寻雪恭慕兴学光当关首并告看失"
    "热后质凡丸义叉之农专东车区匹巨归带满既满骤嚣疑凰巷翼"
)


def parse_dict(path):
    chars, words = {}, {}
    in_data = False
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not in_data:
                in_data = line.strip() == "..."
                continue
            if not line or line.startswith("#"):
                continue
            cols = line.split("\t")
            if len(cols) < 2 or not cols[1].isalpha():
                continue
            text, code = cols[0], cols[1]
            weight = int(cols[2]) if len(cols) >= 3 and cols[2].isdigit() else 0
            if len(text) == 1:
                chars.setdefault(text, []).append((code, weight))
            else:
                prev = words.get(text)
                if prev is None or weight > prev[1]:
                    words[text] = (code, weight)
    return chars, words


def char_info(variants):
    codes = sorted({c for c, _ in variants if not c.startswith("z")}, key=len)
    return codes, max(w for _, w in variants)


def word_code(word, full):
    try:
        f = [full[ch] for ch in word]
    except KeyError:
        return None
    n = len(word)
    if n == 2:
        return f[0][:2] + f[1][:2]
    if n == 3:
        return f[0][0] + f[1][0] + f[2][:2]
    return f[0][0] + f[1][0] + f[2][0] + f[-1][0]


def normalize_roots(roots):
    for info in roots["keys"].values():
        info["roots"] = [{"r": r} if isinstance(r, str) else {"r": r[0], "n": r[1]}
                         for r in info["roots"]]
    return roots


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    chars, words = parse_dict(sys.argv[1])
    roots = normalize_roots(json.loads((ROOT / "data" / "roots.json").read_text(encoding="utf-8")))

    info = {}
    for ch, variants in chars.items():
        codes, weight = char_info(variants)
        if codes:
            info[ch] = (codes, weight)
    full = {ch: codes[-1] for ch, (codes, _) in info.items()}
    ranked = sorted(info, key=lambda ch: -info[ch][1])

    char_entries = [{"c": ch, "full": info[ch][0][-1], "short": info[ch][0][0],
                     "codes": info[ch][0]} for ch in ranked[:TOP_CHARS]]

    level1 = sorted(({"c": ch, "code": codes[0]} for ch, (codes, _) in info.items()
                     if len(codes[0]) == 1 and codes[0][0] != "z"), key=lambda e: e["code"])
    level1 = list({e["code"]: e for e in level1}.values())

    key_names = {info_k["keyName"] for info_k in roots["keys"].values()}
    root_chars = set()
    chengzi = []
    for letter, k in roots["keys"].items():
        for r in k["roots"]:
            root_chars.add(r["r"])
            ch = r["r"]
            if "n" in r or ch == k["keyName"] or ch not in full:
                continue
            code = full[ch]
            if code[0] == letter.lower() and set(code[1:]) <= STROKE_LETTERS:
                chengzi.append({"c": ch, "key": letter, "code": code})

    id_chars = []
    for ch in ranked:
        code = full[ch]
        if (len(code) == 3 and code[2] in ID_LETTERS and ch not in root_chars
                and ch not in key_names):
            id_chars.append({"c": ch, "code": code})
            if len(id_chars) >= ID_CHARS:
                break

    hard = [{"c": ch, "code": full[ch]} for ch in dict.fromkeys(HARD_CHARS) if ch in full]

    word_lists = {n: [] for n in WORD_LIMITS}
    for w, (code, weight) in sorted(words.items(), key=lambda kv: -kv[1][1]):
        n = min(len(w), 5)
        if len(word_lists[n]) >= WORD_LIMITS[n] or word_code(w, full) != code:
            continue
        word_lists[n].append({"w": w, "code": code})

    used = set(c for lst in word_lists.values() for e in lst for c in e["w"])
    used |= set(e["c"] for e in char_entries)
    char_full = {ch: full[ch] for ch in sorted(used)}

    data = {
        "roots": roots,
        "chars": char_entries,
        "charFull": char_full,
        "level1": level1,
        "chengzi": chengzi,
        "idChars": id_chars,
        "hard": hard,
        "words": {str(n): lst for n, lst in word_lists.items()},
    }
    out = ["// Auto-generated by scripts/build_data.py — do not edit by hand.",
           "// Source: rime-wubi (https://github.com/rime/rime-wubi), LGPLv3.",
           "window.WUBI_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";"]
    out_path = ROOT / "js" / "data.js"
    out_path.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")
    print(f"chars={len(char_entries)} level1={len(level1)} chengzi={len(chengzi)} "
          f"idChars={len(id_chars)} hard={len(hard)} "
          + " ".join(f"words{n}={len(l)}" for n, l in word_lists.items()))


if __name__ == "__main__":
    main()
