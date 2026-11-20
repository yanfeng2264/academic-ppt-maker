const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {dependency}=require('../src/dependencies.cjs');
const {args,loadProject,createRunDirectory}=require('../src/project.cjs');
const {extractTheme}=require('../src/theme.cjs');
const {compose}=require('../src/layouts.cjs');
const {renderPptx}=require('../src/pptx.cjs');
const {renderHtml}=require('../src/html.cjs');
const {escape}=require('../src/text.cjs');
const sharp=dependency('sharp');
async function asset(file){const buffer=await sharp(file).rotate().png().toBuffer(),metadata=await sharp(buffer).metadata();return{width:metadata.width,height:metadata.height,data:'data:image/png;base64,'+buffer.toString('base64')};}
function paletteHtml(theme,school){
  const rows=[['主色','primary'],['浅底标题色','primaryText'],['深色','deep'],['浅色背景','pale'],['正文','text'],['次要文字','muted']].map(([label,key])=>`<tr><td><span style="background:${theme.tokens[key]}"></span>${label}</td><td>${theme.tokens[key]}</td></tr>`).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>校徽取色与配色</title><style>body{font:18px/1.8 'Microsoft YaHei',sans-serif;color:#242424;max-width:760px;margin:40px auto;padding:0 24px}h1{color:${theme.tokens.primaryText}}table{border-collapse:collapse;width:100%}td{padding:8px 0}span{display:inline-block;width:32px;height:24px;vertical-align:middle;margin-right:16px;box-shadow:inset 0 0 0 1px #0001}small{color:#626262}</style><h1>校徽取色与配色</h1><p>${escape(school)} · ${escape(theme.note)}</p><table>${rows}</table><p>图像提取色：${theme.extractedPrimary||'无法可靠推断'}<br>最终使用色：${theme.selectedPrimary}<br>选择依据：${theme.selection}</p><small>此表为独立说明，不计入三页样张。候选色与完整检查数值见 palette.json。</small></html>`;
}
async function main(){
  const config=loadProject(args()),theme=await extractTheme(config.logoPath,config.theme);
  const metrics=JSON.parse(fs.readFileSync(path.join(config.root,'config','layout.json'),'utf8'));
  const assets={color:await asset(config.logoPath),figures:{}};
  for(const [i,s]of config.content.slides.entries())if(s.figure?.path){const file=path.resolve(path.dirname(config.contentPath),s.figure.path);assets.figures[i]=await asset(file);}
  const pages=compose(config.content,theme,metrics,assets);
  const run=createRunDirectory(config.outputPath,config.name);fs.mkdirSync(path.join(run,'previews'));
  const model={schemaVersion:1,title:config.title,school:config.school,purpose:config.purpose,canvas:metrics.canvas,theme,fonts:config.fonts,pages};
  fs.writeFileSync(path.join(run,'model.json'),JSON.stringify(model,null,2));
  fs.writeFileSync(path.join(run,'palette.json'),JSON.stringify({...theme,source:config.logos.source||null,logoFile:path.basename(config.logoPath)},null,2));
  fs.writeFileSync(path.join(run,'palette.html'),paletteHtml(theme,config.school));
  const license=fs.readFileSync(path.join(config.root,'assets','fonts','OFL.txt'),'utf8');
  const chars=JSON.stringify(config.content)+fs.readFileSync(path.join(config.root,'src','layouts.cjs'),'utf8')+'方向键空格翻页全屏帮助关闭当前环境暂不支持窗口放映首页末页0123456789←→?';
  const textPath=path.join(run,'font-characters.txt'),fontDest=path.join(run,'font-subset.woff2');fs.writeFileSync(textPath,chars);
  const sub=spawnSync(process.env.PYTHON||'python',[path.join(config.root,'scripts','subset_font.py'),config.fontPath,textPath,fontDest],{encoding:'utf8',windowsHide:true});
  if(sub.status!==0)throw new Error(`字体子集构建失败，请检查 Python、fonttools 和 brotli。${sub.stderr||sub.error||''}`);
  const font=fs.readFileSync(fontDest).toString('base64');
  fs.writeFileSync(path.join(run,'汇报模板.html'),renderHtml(model,config,font,license));
  await renderPptx(model,config,path.join(run,'汇报模板.pptx'));
  const manifest={runDirectory:run,pptx:'汇报模板.pptx',html:'汇报模板.html',palette:'palette.html',model:'model.json',slides:pages.length,primary:theme.selectedPrimary,createdAt:new Date().toISOString(),checks:{html:'not_run',pptx:'not_run'}};
  fs.writeFileSync(path.join(run,'manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(config.outputPath,'latest.json'),JSON.stringify({runDirectory:path.relative(config.outputPath,run)},null,2));
  console.log(`已生成 ${pages.length} 页。校徽主色：${theme.selectedPrimary}（${theme.selection}）\n输出目录：${run}\n执行 npm run check 与 npm run check:pptx 完成独立验证。`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
