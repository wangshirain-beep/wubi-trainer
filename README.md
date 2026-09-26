# wubi-trainer

86 版五笔字型学习与练习工具。纯静态网页，无需安装、无需联网，直接用浏览器打开 `index.html` 即可使用。

## 学习路线

1. **字根表**：键盘分区（横竖撇捺折）、25 个键名字、每键字根与助记口诀。
2. **字根练习**：「看字根选键位」「看键位选字根」两种测验，答错的题会重新出现。
3. **拆字练习**：看汉字输入完整编码，提交后显示逐键拆解和可用简码。
4. **打字练习**：高频单字 + 词组连续输入，要求使用最短简码，统计码/分钟和正确率。

学习进度保存在浏览器 localStorage 中。

## 运行

```bash
# 直接双击 index.html，或：
python3 -m http.server 8000   # 然后访问 http://localhost:8000
```

## 数据

- `data/roots.json`：字根表与助记口诀（手工整理，并用编码数据校验过字根所在键位）。
- `js/data.js`：由 `scripts/build_data.py` 生成，包含最常用 3500 个单字和 6000 个词组的编码。

重新生成数据：

```bash
curl -LO https://raw.githubusercontent.com/rime/rime-wubi/master/wubi86.dict.yaml
python3 scripts/build_data.py wubi86.dict.yaml
```

编码数据来自 [rime-wubi](https://github.com/rime/rime-wubi)（LGPLv3）。
