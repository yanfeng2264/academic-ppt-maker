// Layout coordinates are logical points on a 960 × 540 canvas.
// Add a named function to REGISTRY to introduce another layout.
function compose(content, theme, metrics, assets) {
  const T=theme.tokens, S=metrics.type;
  const result=[];
  const make=(slide,index)=>({id:`slide-${index+1}`,layout:slide.layout,title:slide.title,bg:T.surface,notes:slide.notes||'',elements:[]});
  const box=(p,x,y,w,h,fill)=>p.elements.push({type:'rect',x,y,w,h,color:fill});
  const line=(p,x,y,w,h,color,width=1)=>p.elements.push({type:'line',x,y,w,h,color,width});
  const text=(p,value,x,y,w,h,size,color=T.text,bold=false,align='left',role='body')=>{
    if(value==null||value==='')return;
    p.elements.push({type:'text',value:String(value),x,y,w,h,size,color,bold,align,role});
  };
  function image(p,asset,x,y,w,h,alt) {
    if(!asset)throw new Error(`缺少图片素材：${alt}`);
    const scale=Math.min(w/asset.width,h/asset.height),iw=asset.width*scale,ih=asset.height*scale;
    p.elements.push({type:'image',data:asset.data,x:x+(w-iw)/2,y:y+(h-ih)/2,w:iw,h:ih,alt});
  }
  function logo(p,x,y,w,h){image(p,assets.color,x,y,w,h,'学校校徽与校名原始素材');}
  function header(p,s){
    logo(p,742,28,170,48);
    text(p,s.title,48,70,678,54,S.title,T.primaryText,true,'left','title');
    line(p,48,134,88,0,T.primary,2.2);
  }
  const REGISTRY={
    cover(s,i){
      const p=make(s,i),m=metrics.cover;
      logo(p,56,38,m.logoWidth,64);
      box(p,0,m.bandY,960,m.bandHeight,T.primary);
      text(p,s.english,56,161,848,28,14,T.onPrimary,false,'left','label');
      text(p,s.title,56,204,848,76,S.coverTitle,T.onPrimary,true,'left','title');
      text(p,s.subtitle,56,294,848,62,S.body,T.onPrimary);
      for(const [x,label,value,w] of [[56,'汇报人',s.presenter,210],[344,'院系 / 专业',s.department,300],[744,'汇报日期',s.date,180]]){
        text(p,label,x,435,w,24,14,T.muted,false,'left','label');
        text(p,value,x,472,w,38,20,T.text,true,'left','metadata');
      }
      return p;
    },
    evidence(s,i){
      if(!s.figure||!Array.isArray(s.points)||s.points.length>3||!s.points.length)throw new Error('evidence 版式需要 figure 和 1–3 个 points；更多要点请拆页。');
      const p=make(s,i),m=metrics.evidence,f=m.figure;
      header(p,s);
      if(s.figure.path){image(p,assets.figures[i],f.x,f.y,f.w,f.h,s.figure.alt||s.figure.title||'研究图');}
      else {
        box(p,f.x,f.y,f.w,f.h,T.neutralSurface);
        text(p,'EVIDENCE',f.x+24,f.y+20,f.w-48,24,14,T.primaryText,false,'left','label');
        text(p,s.figure.title||'研究图 / 图表素材位',f.x+24,f.y+89,f.w-48,44,26,T.text,true,'center');
        text(p,s.figure.hint||'请替换为有来源的研究图',f.x+24,f.y+140,f.w-48,38,20,T.muted,false,'center');
      }
      text(p,s.figure.caption,f.x,f.y+f.h+14,f.w,36,S.note,T.muted,false,'left','source');
      s.points.forEach((item,j)=>{
        const y=m.sidebarTop+j*m.sidebarStep;
        text(p,String(j+1).padStart(2,'0'),m.sidebarX,y+3,32,30,18,T.primaryText,true,'left','number');
        text(p,item.title,m.sidebarX+40,y,m.sidebarWidth-40,34,24,T.text,true);
        text(p,item.body,m.sidebarX,y+34,m.sidebarWidth,64,S.sidebar,T.muted);
      });
      const b=m.summary;box(p,b.x,b.y,b.w,b.h,T.pale);box(p,b.x,b.y,3,b.h,T.primary);
      text(p,s.conclusion,b.x+20,b.y+10,b.w-40,34,22,T.primaryText,true);
      return p;
    },
    closing(s,i){
      const p=make(s,i),m=metrics.closing;
      logo(p,56,38,216,64);
      text(p,s.english,48,178,864,26,14,T.primaryText,false,'center','label');
      text(p,s.title,48,220,864,76,S.coverTitle,T.primaryText,true,'center','title');
      text(p,s.subtitle,48,303,864,42,S.body,T.muted,false,'center');
      box(p,0,m.bandY,960,m.bandHeight,T.primary);
      text(p,s.footer,56,m.bandY+38,450,38,S.body,T.onPrimary,true);
      text(p,s.presenter?`汇报人：${s.presenter}`:'',648,m.bandY+42,256,30,18,T.onPrimary,false,'right','metadata');
      return p;
    }
  };
  content.slides.forEach((s,i)=>{
    if(typeof s.title!=='string'||!s.title.trim())throw new Error(`第 ${i+1} 页缺少标题。`);
    if(!REGISTRY[s.layout])throw new Error(`暂不支持版式 ${s.layout}；已实现 cover / evidence / closing。`);
    const p=REGISTRY[s.layout](s,i);
    for(const e of p.elements)if(e.x<0||e.y<0||e.x+e.w>960.1||e.y+e.h>540.1)throw new Error(`第 ${i+1} 页对象越出画布：${e.value||e.type}`);
    result.push(p);
  });
  return result;
}
module.exports={compose};
