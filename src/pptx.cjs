const {dependency}=require('./dependencies.cjs');
const {runs}=require('./text.cjs');
async function renderPptx(model,config,dest) {
  const PptxGenJS=dependency('pptxgenjs'),pptx=new PptxGenJS();
  pptx.defineLayout({name:'LOGICAL_960',width:960/72,height:540/72});pptx.layout='LOGICAL_960';
  pptx.title=config.title;pptx.subject=config.purpose;pptx.author='';pptx.company='';pptx.lang='zh-CN';
  pptx.theme={headFontFace:config.fonts.chinese,bodyFontFace:config.fonts.chinese,lang:'zh-CN'};
  for(const p of model.pages){
    const slide=pptx.addSlide();slide.background={color:p.bg.slice(1)};
    for(const e of p.elements){
      const b={x:e.x/72,y:e.y/72,w:e.w/72,h:e.h/72};
      if(e.type==='rect')slide.addShape(pptx.ShapeType.rect,{...b,line:{color:e.color.slice(1),transparency:100},fill:{color:e.color.slice(1)}});
      else if(e.type==='line')slide.addShape(pptx.ShapeType.line,{...b,line:{color:e.color.slice(1),width:e.width}});
      else if(e.type==='image')slide.addImage({...b,data:e.data,altText:e.alt});
      else if(e.type==='text')slide.addText(runs(e.value).map(r=>({text:r.value,options:{fontFace:r.latin?config.fonts.english:config.fonts.chinese}})),{
        ...b,fontFace:config.fonts.chinese,fontSize:e.size,color:e.color.slice(1),bold:e.bold,align:e.align,
        margin:0,valign:'top',paraSpaceAfter:0,lineSpacingMultiple:1.2,isTextBox:true
      });
    }
    slide.addNotes(`${p.notes}\n主题主色：${model.theme.selectedPrimary}；取色来源：校徽图像。当前为可替换样张内容。`);
  }
  await pptx.writeFile({fileName:dest});
}
module.exports={renderPptx};
