const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {dependency}=require('../src/dependencies.cjs');
const {findRun,saveManifest}=require('../src/run.cjs');
async function main(){
  const {run,manifest}=findRun(process.argv[2]),previews=path.join(run,'previews');fs.mkdirSync(previews,{recursive:true});
  const {chromium}=dependency('playwright');
  const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const executable=candidates.find(p=>fs.existsSync(p));
  const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--disable-extensions','--no-first-run']});
  const report={renderer:'Chromium / Playwright',offline:true,status:'fail',errors:[],networkRequests:[],overflow:[],slides:0,viewports:[]};
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  try{
    const ctx=await browser.newContext({viewport:{width:1600,height:954},offline:true,deviceScaleFactor:1});
    const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.networkRequests.push(r.url());});
    await page.goto(pathToFileURL(path.join(run,manifest.html)).href);await page.evaluate(()=>window.templateReady);
    report.slides=await page.locator('.slide').count();assert(report.slides===manifest.slides,'页面数量不符');
    report.imagesLoaded=await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0));assert(report.imagesLoaded,'图片缺失');
    report.fontLoaded=await page.evaluate(()=>document.fonts.check('24px TemplateNoto'));assert(report.fontLoaded,'内置字体未加载');
    for(let i=0;i<report.slides;i++){
      await page.evaluate(n=>window.slidePlayer.show(n),i);await page.waitForTimeout(60);
      const bad=await page.locator('.slide.active .txt').evaluateAll(els=>els.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>({text:e.innerText,width:e.clientWidth,height:e.clientHeight,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight})));
      report.overflow.push(...bad.map(e=>({page:i+1,...e})));
      await page.locator('.slide.active').screenshot({path:path.join(previews,`html-${i+1}.png`)});
    }
    const current=()=>page.evaluate(()=>window.slidePlayer.current);
    await page.keyboard.press('Home');assert(await current()===0,'Home');await page.keyboard.press('ArrowLeft');assert(await current()===0,'首页边界');
    if(report.slides>1){await page.keyboard.press('ArrowRight');assert(await current()===1,'键盘翻页');await page.locator('#prev').click();assert(await current()===0,'按钮翻页');}
    await page.keyboard.press('End');assert(await current()===report.slides-1,'End');await page.keyboard.press('Space');assert(await current()===report.slides-1,'末页边界');
    await page.evaluate(()=>location.hash='#/9999');await page.waitForTimeout(60);assert(await current()===report.slides-1,'页码上界');
    await page.evaluate(()=>location.hash='#/0');await page.waitForTimeout(60);assert(await current()===0,'页码下界');
    await page.keyboard.press('?');assert(await page.locator('#help').isVisible(),'帮助打开');await page.keyboard.press('Escape');assert(!await page.locator('#help').isVisible(),'帮助关闭');
    await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('not available'));});await page.locator('#fullscreen').click();assert(await page.locator('#notice').isVisible(),'全屏失败回退');
    for(const viewport of [{width:1024,height:768},{width:1280,height:720},{width:390,height:844}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(60);const a=await page.locator('#deck').boundingBox(),b=await page.locator('#stage').boundingBox();
      const fits=a.x>=-1&&a.y>=-1&&a.x+a.width<=b.width+1&&a.y+a.height<=b.height+1;assert(fits,'画布越界');report.viewports.push({...viewport,fits});
    }
    await page.setViewportSize({width:1600,height:954});await page.evaluate(()=>window.slidePlayer.show(0));
    const cdp=await ctx.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');
    const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.slide.active .latin'});
    report.englishFonts=node.nodeId?(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts.map(f=>({family:f.familyName,postscript:f.postScriptName,glyphs:f.glyphCount})):[];
    await page.pdf({path:path.join(previews,'html-print.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
    await page.goto(pathToFileURL(path.join(run,manifest.palette)).href);await page.screenshot({path:path.join(previews,'palette.png'),fullPage:true});
    assert(!report.errors.length&&!report.networkRequests.length&&!report.overflow.length,'发现脚本错误、外部请求或文字溢出');
    report.navigation='pass';report.fullscreenFallback='pass';report.fullscreenSuccess='not_run';report.printExport='pass';report.status='pass';
  }catch(e){report.failure=e.message;throw e;}
  finally{fs.writeFileSync(path.join(run,'html-validation.json'),JSON.stringify(report,null,2));manifest.checks.html=report.status;saveManifest(run,manifest);await browser.close();}
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
