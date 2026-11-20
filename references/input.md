# 输入与配置

从项目根目录执行命令。`config/project.json` 内的文件路径相对于项目目录，`figure.path` 相对于内容 JSON 所在目录，CLI 文件路径相对于当前命令行目录。

| 文件或字段 | 作用 |
|---|---|
| `config/project.json` | 学校、校徽、字体、内容文件、输出位置与主题覆盖 |
| `logos.color` | 取色与浅底展示用的原始校徽/组合图 |
| `logos.reverse` | 预留官方反白素材；当前三类版式的校徽都放在浅底上，不自动使用或合成反白 |
| `theme.primary` | 可选手动主色，默认 null 自动取色 |
| `theme.officialPrimary` | 用户明确提供并要求采用的官方标准色 |
| `fonts` | 中文字体、英文字体与允许分发的中文字体文件 |
| `content/demo.json` | 三页样张文字、备注与素材信息 |
| `config/layout.json` | 字号、位置、版心和素材区大小 |

内容 `slides` 是按放映顺序排列的页面数组，每页需有 `layout` 与非空 `title`。

- `cover`：english、subtitle、presenter、department、date。
- `evidence`：figure、1–3 个 points、conclusion。figure 内 path 为 null 时显示素材位；指定相对路径则插入实际图像，并保留 title、caption、alt。每个 point 使用 title 与 body，正文换行写 `\n`。
- `closing`：english、subtitle、footer、presenter。
- 任意页可以增加 notes，写入 PPT 讲者备注，不作为可见正文。

只承诺当前三种运行版式；后续新建其他版式时须扩展 `src/layouts.cjs` 的注册表。agent 可以把 Word、PDF 或纯文本整理成此内容结构，但 CLI 首版直接读取 JSON，不内置通用 Word/PDF 解析或语义摘要模型。

`node scripts/build.cjs` 支持：

```text
--logo FILE           临时换校徽，仍保持原图颜色
--school TEXT         相应的学校名称
--primary #RRGGBB     本次手动覆盖主色
--content FILE        使用另一个内容 JSON
--config FILE         使用项目内另一份配置（放在 config/ 下）
--out DIRECTORY       输出到其他目录
--name TEXT           本次输出目录名称
```

更换彩色校徽后，务必同时更新校名与来源；如配置中保留旧学校反白素材，也应清空或更换。临时 `--logo` 会自动忽略旧反白配置。
