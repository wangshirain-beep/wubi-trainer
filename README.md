# wubi-trainer

86 版五笔字型学习与练习工具。纯静态网页，无需安装、无需联网，直接用浏览器打开 `index.html` 即可使用。

## 学习路线

1. **字根表**：键盘分区（横竖撇捺折）、25 个键名字、每键全部字根（含变形部件和例字）与助记口诀。
2. **基础练习**：一级简码、键名汉字、键内汉字（成字字根，报户口规则）、看字根选键位、看键位选字根。
3. **拆字练习**：常用字、末笔识别码字（附识别码表）、难拆字，提交后显示逐键编码和规则说明。
4. **打字练习**：单字、二字词、三字词、四字词语、多字词组，显示每个字取哪几码，结束时给出星级和错题。
5. **游戏**：汉字雨，打出下落字词的编码消灭它们，关卡越高越快，有连击和最高分。

学习进度保存在浏览器 localStorage 中。

## 运行

```bash
# 直接双击 index.html，或：
python3 -m http.server 8000   # 然后访问 http://localhost:8000
```

## 数据

- `data/roots.json`：字根表与助记口诀（手工整理，并用编码数据校验过字根所在键位）。
- `js/data.js`：由 `scripts/build_data.py` 生成，包含常用单字、一级简码、成字字根、识别码字、难拆字和按字数分类的词组编码；词组编码在生成时都按取码规则校验过。

重新生成数据：

```bash
curl -LO https://raw.githubusercontent.com/rime/rime-wubi/master/wubi86.dict.yaml
python3 scripts/build_data.py wubi86.dict.yaml
```

编码数据来自 [rime-wubi](https://github.com/rime/rime-wubi)（LGPLv3）。
