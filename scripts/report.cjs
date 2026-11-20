const fs=require('node:fs');const path=require('node:path');
const {dependency}=require('../src/dependencies.cjs');const {findRun}=require('../src/run.cjs');
const {escape}=require('../src/text.cjs');const sharp=dependency('sharp');
async function main(){
  const {run,manifest}=findRun(process.argv[2]),previews=path.join(run,'previews');
  const read=n=>{const f=path.join(run,n);return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null;};
  const palette=read('palette.json'),html=read('html-validation.json'),pptx=read('pptx-validation.json'),pdf=read('pdf-validation.json');
  for(const kind of ['html','pptx']){
    const tiles=[];let complete=true;
    for(let i=1;i<=manifest.slides;i++){
      const f=path.join(previews,`${kind}-${i}.png`);if(!fs.existsSync(f)){complete=false;break;}
      const buffer=await sharp(f).resize(620,349).png().toBuffer();
      tiles.push({input:buffer,left:(i-1)*640+10,top:40});
      const label=Buffer.from(`<svg width="640" height="30"><text x="14" y="20" font-family="Arial" font-size="13" fill="#626262">${kind.toUpperCase()} / ${i}</text></svg>`);
      tiles.push({input:label,left:(i-1)*640,top:0});
    }
    if(complete)await sharp({create:{width:manifest.slides*640,height:410,channels:3,background:'#F3EEEE'}}).composite(tiles).png().toFile(path.join(previews,`${kind}-overview.png`));
  }
  const notes=`# 配色与检查说明\n\n主题来源：校徽图像。当前为三页模板，研究图与实验数据均未伪造。\n\n| 配色 | 色值 |\n|---|---|\n| 主色 | ${palette.tokens.primary} |\n| 浅底标题 | ${palette.tokens.primaryText} |\n| 深色 | ${palette.tokens.deep} |\n| 浅色 | ${palette.tokens.pale} |\n| 正文 | ${palette.tokens.text} |\n\n${palette.note}\n\n| 检查 | 状态 |\n|---|---|\n| HTML 离线与排版 | ${html?.status||'not_run'} |\n| PowerPoint 实际渲染 | ${pptx?.status||'not_run'} |\n| PPTX 文本实际编辑 | ${pptx?.editableText||'not_run'} |\n| PPTX 字体保存 | ${pptx?.fontEmbedding||'not_run'} |\n| 两种 PDF 页数、比例与内容 | ${pdf?.status||'not_run'} |\n\n正文模型、颜色候选与各项检查的原始记录保存在同目录 JSON 文件中。HTML 的全屏成功模式未作为自动检查结论；已检查失败回退。\n\n英文使用本机 Times New Roman；跨设备可能回退其他衬线字体。校徽使用已有官方 PNG，放大清晰度受原图限制。第二页是清楚标注的素材位，填入真实图像后需重新检查。\n\n维护入口：../../README.md。每次构建新版本目录，不覆盖正在编辑的文件。\n`;
  fs.writeFileSync(path.join(run,'配色与检查说明.md'),notes);
  const page=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>三页样张预览</title><style>body{font:18px/1.7 'Microsoft YaHei',sans-serif;margin:24px;color:#242424}img{width:100%;max-width:1400px;display:block;margin:20px 0}a{color:${palette.tokens.primaryText}}</style><h1>三页学术汇报样张</h1><p>主色 ${palette.selectedPrimary}，来源：校徽图像提取。</p><p><a href="${encodeURI(manifest.pptx)}">PPTX</a> · <a href="${encodeURI(manifest.html)}">离线 HTML</a> · <a href="palette.html">配色表</a></p><h2>PowerPoint 实际渲染</h2><img src="previews/pptx-overview.png" alt="三页 PPTX 预览"><h2>HTML 实际渲染</h2><img src="previews/html-overview.png" alt="三页 HTML 预览"><p>HTML ${escape(html?.status||'not_run')} · PPTX ${escape(pptx?.status||'not_run')} · PDF ${escape(pdf?.status||'not_run')}</p></html>`;
  fs.writeFileSync(path.join(run,'预览与配色.html'),page);
  console.log(`已生成预览与配色说明：${run}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
