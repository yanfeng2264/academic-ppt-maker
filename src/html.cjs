const fs=require('node:fs');
const path=require('node:path');
const {runs,escape}=require('./text.cjs');
function renderHtml(model,config,font,license) {
  const fontCSS=font?`@font-face{font-family:TemplateNoto;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-display:block}`:'';
  const sections=model.pages.map((p,i)=>{
    const elements=p.elements.map(e=>{
      const s=`--x:${e.x};--y:${e.y};--w:${e.w};--h:${e.h};--color:${e.color||'#242424'};--stroke:${e.width||0};`;
      if(e.type==='text')return `<div class="el txt" data-role="${e.role}" style="${s}--fs:${e.size};--fw:${e.bold?700:400};--align:${e.align}">${runs(e.value).map(r=>r.latin?`<span class="latin" lang="en">${escape(r.value)}</span>`:escape(r.value)).join('')}</div>`;
      if(e.type==='image')return `<img class="el logo" style="${s}" alt="${escape(e.alt)}" src="${e.data}">`;
      return `<div aria-hidden="true" class="el ${e.type==='line'?'rule':'rect'}" style="${s}"></div>`;
    }).join('');
    return `<section class="slide${i===0?' active':''}" style="background:${p.bg}" aria-label="第${i+1}页：${escape(p.title)}" aria-hidden="${i!==0}">${elements}</section>`;
  }).join('');
  const player=fs.readFileSync(path.join(__dirname,'player.js'),'utf8');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(config.title)}</title><style>
${fontCSS}
:root{color-scheme:dark;--brand:${model.theme.tokens.primary}}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#211D1D;font-family:TemplateNoto,'${escape(config.fonts.chinese)}','Microsoft YaHei',sans-serif}
#stage{position:absolute;inset:0 0 54px;overflow:hidden}#deck{position:absolute;left:0;top:0;width:960px;height:540px;transform-origin:0 0}
.slide{position:absolute;inset:0;width:960px;height:540px;overflow:hidden;display:none}.slide.active{display:block}
.el{position:absolute;left:calc(var(--x)*1px);top:calc(var(--y)*1px);width:calc(var(--w)*1px);height:calc(var(--h)*1px)}
.txt{margin:0;font-size:calc(var(--fs)*1px);line-height:1.2;font-weight:var(--fw);color:var(--color);text-align:var(--align);white-space:pre-wrap;overflow:visible}
.latin{font-family:'${escape(config.fonts.english)}',Times,serif}.rect{background:var(--color)}.rule{background:var(--color);min-width:calc(var(--stroke)*1px);min-height:calc(var(--stroke)*1px)}.logo{object-fit:contain}
nav{position:absolute;bottom:0;height:54px;width:100%;display:flex;align-items:center;justify-content:center;gap:14px;color:#F1EAEA;font-size:13px;background:#211D1D}
button{font:inherit;padding:6px 14px;background:transparent;color:inherit;border:1px solid #766969;border-radius:4px;cursor:pointer}button:hover,button:focus-visible{background:#48393A;outline:2px solid white;outline-offset:2px}button:disabled{opacity:.35;cursor:default}#counter{min-width:54px;text-align:center}
#help{position:absolute;bottom:65px;left:50%;transform:translateX(-50%);max-width:90vw;background:white;color:#242424;padding:16px 24px;line-height:1.8;font-size:14px;z-index:3}#help[hidden]{display:none}
#notice{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:white;color:#242424;padding:8px 16px;font-size:14px;z-index:5}#notice:empty{display:none}
:fullscreen #stage{inset:0}:fullscreen nav{opacity:0}:fullscreen nav:hover,:fullscreen nav:focus-within{opacity:1}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
@page{size:960pt 540pt;margin:0}
@media print{html,body{width:960pt;height:auto;overflow:visible;background:white;color-scheme:light}#stage{position:static;overflow:visible;width:960pt;height:auto}#deck{position:static;width:960pt;height:auto;transform:none!important}.slide{display:block!important;position:relative;width:960pt;height:540pt;inset:auto;break-after:page;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}.slide:last-child{break-after:auto}.el{left:calc(var(--x)*1pt);top:calc(var(--y)*1pt);width:calc(var(--w)*1pt);height:calc(var(--h)*1pt)}.txt{font-size:calc(var(--fs)*1pt)}.rule{min-width:calc(var(--stroke)*1pt);min-height:calc(var(--stroke)*1pt)}nav,#help,#notice{display:none!important}}
</style></head><body><main id="stage" aria-label="汇报幻灯片"><div id="deck">${sections}</div></main><nav aria-label="放映控制"><button id="prev" aria-label="上一页">←</button><span id="counter" aria-live="polite"></span><button id="next" aria-label="下一页">→</button><button id="fullscreen">全屏</button><button id="helpButton" aria-expanded="false" aria-controls="help">帮助</button></nav><aside id="help" hidden>方向键 / 空格 / PageUp / PageDown：翻页<br>Home / End：首末页　F：全屏　?：帮助　Esc：关闭帮助<br>Ctrl + P：按幻灯片逐页打印</aside><div id="notice" role="status"></div><script>${player}</script><!-- Noto Sans SC font license\n${license.replaceAll('--','- -')}\n--></body></html>`;
}
module.exports={renderHtml};
