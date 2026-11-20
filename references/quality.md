# 生成与验收

从项目根目录依次运行：

```powershell
node scripts/build.cjs
node scripts/check-html.cjs
python -X utf8 scripts/render_pptx.py
python -X utf8 scripts/check_pdf.py
node scripts/report.cjs
```

命令默认读取 `output/latest.json` 指向的最新版本；检查脚本可以通过第一个位置参数指定某次输出目录。构建每次创建新目录，不覆盖历史版本。

1. 构建：解析配置、提取配色、生成中文字体子集、共用布局模型、生成两种实际文件。此时 `manifest.json` 中的检查仍是 not_run。
2. HTML：实际 Chrome/Edge 或 Playwright Chromium 离线打开；查资源、字体、文本溢出、键盘/按钮/边界页、锚点、帮助、全屏失败回退及多个视口；导出 PDF 和逐页图片。无浏览器时不能视作通过。
3. PPTX：Windows PowerPoint 实际打开，查文字边界，复制一个文字对象进行实际编辑并删除副本；导出图片/PDF，尝试保存嵌入字体。已打开的目标不强制关闭，其他演示文稿保持打开。其他软件不能冒充 PowerPoint 验证结果。
4. PDF：检查两个实际导出文件的页数、960×540 pt 比例及可提取文字。
5. 汇总：从检查结果生成说明和预览。自动检查不替代逐页视觉审阅；查看标题、素材、比例、来源与视觉层级。

脚本如实记录 pass、fail、not_run。全屏成功受设备与浏览器限制，首轮自动验证包含失败回退，不把它表述为所有设备均已全屏成功。手机竖屏只保证整页缩放，未承诺触摸手势或近距离字号。

取色回归用 `node --test tests/theme.test.cjs`：覆盖透明和黑灰文字干扰、色彩归并、多主色、黑白素材回退、浅色对比度、显式覆盖与输出版本保留。

给内容或全局字体做变更后，重新构建并验证新版本。缺少字体、源图、PowerPoint 或浏览器时给出具体限制；不把代码中存在相关功能当成已完成实际检查。
