"""Derive Wubi 86 root splits (拆分) for characters.

Candidate splits come from makemeahanzi's IDS decompositions (LGPLv3) plus a
small hand-written table for components that IDS leaves whole.  A candidate
is accepted only if applying the Wubi coding rules to it reproduces the
character's real code from the dictionary, so every split shown agrees with
the actual code.
"""
import itertools
import json

IDC2 = set("⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻")
IDC3 = set("⿲⿳")
STROKES = {"g": "横", "h": "竖", "t": "撇", "y": "捺", "n": "折"}

# Wubi splits for components that the IDS data does not break down the way
# Wubi does.  Entries are tried alongside IDS candidates and must still
# reproduce the dictionary code to be used.
MANUAL = {
    # aliases: IDS component glyphs that are a Wubi root under another glyph
    "⺼": "月", "匸": "匚", "𠂊": "⺈", "肀": "彐 丨", "罒": "罒",
    # common components
    "疋": "一 龰", "足": "口 龰", "走": "土 龰", "不": "一 小", "亲": "立 木",
    "兆": "⺌ 儿", "艮": "彐 衣", "丂": "一 乙", "耂": "土 丿", "入": "丿 ㇏",
    "与": "一 乙 一", "户": "丶 尸", "于": "一 十", "母": "⺟ 一", "每": "𠂉 ⺟ 一|𠂉 ⺟",
    "先": "丿 土 儿", "未": "二 小", "末": "一 木", "友": "ナ 又", "右": "ナ 口",
    "有": "ナ 月", "左": "ナ 工", "在": "ナ 丨 土", "而": "丆 冂 ‖", "吏": "一 口 乂",
    "万": "丆 乙", "井": "二 ‖", "亥": "亠 乙 人", "隹": "亻 主", "才": "十 丿",
    "勿": "勹 丿丿", "反": "⺁ 又", "尃": "一 月 丶 寸", "亍": "二 丨", "甬": "マ 用",
    "乞": "𠂉 乙", "斗": "冫 十", "咸": "厂 一 口 乙 丿", "牛": "⺧ 丨|丿 扌",
    "豆": "一 口 䒑", "矢": "𠂉 大", "丩": "乙 丨", "衣": "亠 衣", "今": "人 丶 乙",
    "令": "人 丶 マ", "夬": "乙 人", "聿": "彐 二 丨", "舌": "丿 古", "乍": "𠂉 丨 二",
    "介": "人 ‖", "景": "日 高 小", "京": "高 小", "享": "高 子", "弗": "弓 ‖",
    "直": "十 目", "酉": "西 一", "曾": "丷 罒 日", "监": "‖ 𠂉 丶 皿", "束": "一 口 小",
    "斿": "方 𠂉 子", "予": "マ 了", "龹": "丷 大", "官": "宀 コ 丨 コ", "邦": "三 丿 阝",
    "巾": "冂 丨", "曷": "日 勹 人 乙", "兄": "口 儿", "㐬": "亠 厶 儿", "居": "尸 古",
    "君": "彐 丿 口", "尤": "ナ 乙", "尢": "ナ 乙", "弟": "丷 弓 丨 丿", "礻": "礻 丶",
    "衤": "礻 冫", "犭": "犭 丿", "肰": "夕 犬", "夅": "夂 匚 丨", "羊": "丷 羊",
    "自": "丿 目", "页": "丆 贝", "来": "一 米", "长": "丿 七 ㇏", "里": "日 土",
    "东": "七 小", "专": "二 乙 丶", "电": "日 乙", "无": "二 儿", "气": "⺧ 乙",
    "必": "心 丿", "及": "乃 ㇏", "千": "丿 十", "午": "𠂉 十", "失": "⺧ 人",
    "朱": "⺧ 小", "告": "丿 土 口", "民": "コ 七", "以": "乙 丶 人", "么": "丿 厶",
    "丸": "九 丶", "凡": "几 丶", "主": "丶 王", "玉": "王 丶", "互": "一 ⺟ 一",
    "见": "冂 儿", "开": "一 廾", "并": "䒑 廾", "关": "丷 大", "单": "丷 日 十",
    "共": "龷 八", "黄": "龷 由 八", "其": "龷 三 八",
    "世": "廿 乙", "内": "冂 人", "同": "冂 一 口", "向": "丿 冂 口", "冬": "夂 冫",
    "各": "夂 口", "条": "夂 木", "麦": "龶 夂", "表": "龶 衣", "青": "龶 月",
    "看": "龵 目", "后": "⺁ 一 口", "质": "⺁ 十 贝", "斤": "斤", "丘": "斤 一",
    "兵": "斤 一 八", "爱": "爫 冖 ナ 又", "采": "爫 木", "受": "爫 冖 又",
    "氏": "氏 七", "印": "氏 一 卩", "或": "戈 口 一", "可": "丁 口", "习": "乙 冫",
    "亦": "亠 业", "皮": "皮 又", "业": "业 一", "龙": "ナ 匕", "北": "丬 匕",
    "产": "立 丿", "克": "古 儿", "头": "冫 大", "飞": "乙 冫", "非": "三 ‖ 三",
    "步": "止 小", "归": "‖ 彐", "光": "⺌ 儿", "应": "广 ⺍", "声": "士 尸",
    # whole characters whose Wubi split differs from their IDS
    "我": "丿 扌 乙 丿", "年": "⺧ 丨 十", "成": "厂 乙 乙 丿", "首": "䒑 丿 目",
    "真": "十 且 八", "美": "丷 王 大", "离": "文 凵 冂 厶", "起": "土 龰 己",
    "书": "乙 乙 丨 丶", "为": "丶 力 丶", "出": "凵 山", "事": "一 口 彐 丨",
    "发": "乙 丿 又 丶", "生": "丿 王", "买": "乙 冫 大", "卖": "十 乙 冫 大",
    "身": "丿 冂 三 丿", "重": "丿 一 日 土", "象": "⺈ 冃 豕", "义": "丶 乂",
    "举": "兴 二 丨", "兴": "兴 八", "学": "⺍ 冖 子", "觉": "⺍ 冖 冂 儿",
    "问": "门 口", "送": "丷 大 辶", "平": "一 丷 丨", "差": "丷 羊 工",
    "养": "丷 羊 八 丨", "着": "丷 羊 目", "前": "䒑 月 刂", "道": "䒑 丿 目 辶",
    "带": "一 卄 冖 丨", "两": "一 冂 人 人", "再": "一 冂 土", "高": "高 冂 口",
    "亮": "高 冖 几", "就": "高 小 ナ 乙", "市": "亠 冂 丨", "国": "囗 王 丶",
    "贯": "⺟ 十 贝", "求": "十 水 丶", "录": "彐 水",
    "永": "丶 乙 水", "片": "丿 丨 一 乙", "鬼": "白 儿 厶", "免": "⺈ 口 儿",
    "角": "⺈ 用", "色": "⺈ 巴", "争": "⺈ 彐 丨", "危": "⺈ 厂 㔾", "负": "⺈ 贝",
    "急": "⺈ 彐 心", "务": "夂 力", "处": "夂 卜", "夏": "丆 目 夂", "复": "𠂉 日 夂",
    "所": "⺁ コ 斤", "牙": "匚 丨 丿", "舀": "爫 臼", "找": "扌 戈", "戴": "十 戈 田 龷 八",
    "司": "乙 一 口", "孔": "孑 乙", "变": "亠 业 又", "第": "⺮ 弓 丨 丿",
    "号": "口 一 乙", "全": "人 王", "面": "丆 冂 ‖ 三", "即": "彐 厶 卩",
    "商": "立 冂 八 口", "百": "丆 日", "扁": "丶 尸 冂 卄", "局": "尸 乙 口",
    "场": "土 乙 丿丿 丿", "杨": "木 乙 丿丿 丿", "易": "日 勹 丿丿", "物": "丿 扌 勹 丿丿",
    "节": "艹 卩", "经": "纟 ス 工", "派": "氵 ⺁ 衣", "夜": "亠 亻 夂 丶",
    "展": "尸 卄 衣", "留": "⺈ 丶 刀 田", "街": "彳 土 土 二 丨", "常": "⺍ 冖 口 冂 丨",
    "堂": "⺍ 冖 口 土", "黑": "罒 土 灬", "制": "⺧ 冂 丨 刂", "番": "丿 米 田",
    "那": "刀 二 阝", "敢": "乙 耳 攵", "班": "王 丶 丿 王", "鼎": "目 乙 乙",
    "凸": "丨 一 冂 一", "凹": "冂 丨 乙 一",
    # second batch
    "乚": "乙", "具": "且 八", "算": "⺮ 目 廾", "鱼": "鱼 一", "毛": "丿 二 乙",
    "毫": "高 冖 丿 二 乙", "叚": "コ 丨 二 又", "兰": "丷 二", "泰": "三 人 氺",
    "春": "三 人 日", "奉": "三 人 二 丨", "秦": "三 人 禾", "禺": "日 冂 丨 丶",
    "半": "丷 十", "布": "ナ 冂 丨", "丝": "幺 幺 一", "乐": "⺈ 小",
    "属": "尸 丿 口 冂 丶", "段": "亻 三 几 又", "殳": "几 又", "舟": "丿 丹",
    "曲": "冂 廿", "囱": "丿 囗 夕", "饣": "⺈ 乙", "农": "冖 衣", "弄": "王 廾",
    "屯": "一 凵 乙", "尹": "彐 丿", "果": "日 木", "余": "人 禾", "龺": "十 早",
    "往": "彳 丶 王", "尽": "尸 ㇏ 冫", "普": "丷 业 一 日", "屏": "尸 䒑 廾",
    "存": "ナ 丨 子", "幻": "幺 乙", "升": "丿 廾", "亭": "高 冖 丁",
    "爪": "⺁ 丨 ㇏", "旅": "方 𠂉 衣", "族": "方 𠂉 𠂉 大", "奥": "丿 冂 米 大",
    "益": "丷 八 皿", "章": "立 早", "亡": "亠 乙", "壴": "士 口 䒑", "画": "一 田 凵",
    "乔": "丿 大 ‖", "垂": "丿 一 艹 士", "㐌": "𠂉 也", "紧": "‖ 又 幺 小",
    "革": "廿 革", "齐": "文 ‖", "旁": "立 冖 方", "党": "⺌ 冖 口 儿",
    "命": "人 一 口 卩", "威": "厂 一 女 丿", "蛋": "乙 龰 虫", "聚": "耳 又 丿 丨 小",
    "曹": "一 冂 卄 日", "伤": "亻 𠂉 力", "鸟": "勹 丶 乙 一", "久": "勹 ㇏",
    "击": "二 山", "匈": "勹 乂 凵", "州": "丶 丿 丶 丨 丶 丨", "卫": "卩 一",
    "甫": "一 月 丨 丶", "断": "米 乙 斤",
    # third batch
    "率": "亠 幺 氺 十", "夫": "二 人", "灰": "ナ 火", "载": "十 戈 车", "乡": "幺 丿",
    "夹": "一 丷 人", "盖": "丷 王 皿", "巨": "匚 コ", "宏": "宀 ナ 厶", "承": "了 三 水",
    "函": "了 凵 水", "丑": "乙 土", "瓦": "一 乙 乙", "丢": "丿 土 厶", "尺": "尸 ㇏",
}


def load_ids(path):
    ids = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            j = json.loads(line)
            ids[j["character"]] = j
    return ids


def _parse(s, i=0):
    c = s[i]
    if c in IDC2 or c in IDC3:
        kids, j = [], i + 1
        for _ in range(3 if c in IDC3 else 2):
            node, j = _parse(s, j)
            kids.append(node)
        return (c, kids), j
    return c, i + 1


class Decomposer:
    def __init__(self, root_keys, ids, chengzi_codes):
        self.root_keys = root_keys      # glyph -> key letter
        self.ids = ids
        self.chengzi = chengzi_codes    # glyph -> code, for character-forming roots
        self.memo = {}

    def _seqs(self, node, depth):
        if depth > 8:
            return []
        if isinstance(node, tuple):
            op, kids = node
            parts = [self._seqs(k, depth + 1) for k in kids]
            if not all(parts):
                return []
            if op == "⿺" and kids and isinstance(kids[0], str) and kids[0] in "辶廴":
                parts = parts[1:] + parts[:1]
            out = []
            for combo in itertools.product(*parts):
                out.append([g for p in combo for g in p])
                if len(out) >= 300:
                    break
            return out
        ch = node
        if ch in self.memo:
            return self.memo[ch]
        self.memo[ch] = []
        res = []
        if ch in self.root_keys:
            res.append([ch])
        for alt in MANUAL.get(ch, "").split("|"):
            seq = alt.split()
            if seq and seq != [ch]:
                res.append(seq)
        j = self.ids.get(ch)
        dec = j.get("decomposition") if j else None
        if dec and "？" not in dec and dec != ch:
            try:
                tree, _ = _parse(dec)
                res += self._seqs(tree, depth + 1)
            except (IndexError, RecursionError):
                pass
        res = [s for s in res if all(g in self.root_keys for g in s)]
        self.memo[ch] = res[:400]
        return self.memo[ch]

    def explain(self, ch, code):
        k = self.root_keys.get(ch)
        if k and code == k * 4:
            return {"t": "keyname", "r": [ch]}
        if k and ch in self.chengzi and self.chengzi[ch] == code:
            return {"t": "chengzi", "r": [ch]}
        best = None
        for s in self._seqs(ch, 0):
            if len(s) < 2:
                continue
            keys = "".join(self.root_keys[g] for g in s)
            n = len(s)
            if n >= 4 and keys[:3] + keys[-1] == code:
                cand = {"t": "split", "r": s}
            elif n in (2, 3) and len(code) == n + 1 and keys == code[:n]:
                cand = {"t": "split", "r": s, "id": code[-1]}
            else:
                continue
            if best is None or len(s) < len(best["r"]):
                best = cand
        return best
