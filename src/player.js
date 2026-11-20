(() => {
  const slides=[...document.querySelectorAll('.slide')],deck=document.querySelector('#deck'),stage=document.querySelector('#stage');
  let current=0;
  function resize(){const s=Math.min(stage.clientWidth/960,stage.clientHeight/540);deck.style.transform=`scale(${s})`;deck.style.left=(stage.clientWidth-960*s)/2+'px';deck.style.top=(stage.clientHeight-540*s)/2+'px';}
  function readHash(){const m=location.hash.match(/^#\/(\d+)$/);return m?Math.min(slides.length-1,Math.max(0,Number(m[1])-1)):0;}
  function show(n){
    current=Math.max(0,Math.min(slides.length-1,n));
    slides.forEach((s,i)=>{s.classList.toggle('active',i===current);s.setAttribute('aria-hidden',String(i!==current));s.inert=i!==current;});
    document.querySelector('#counter').textContent=`${current+1} / ${slides.length}`;
    document.querySelector('#prev').disabled=current===0;document.querySelector('#next').disabled=current===slides.length-1;
    const hash='#/'+(current+1);if(location.hash!==hash)location.hash=hash;
  }
  function help(force){const h=document.querySelector('#help');h.hidden=force===undefined?!h.hidden:!force;document.querySelector('#helpButton').setAttribute('aria-expanded',String(!h.hidden));}
  async function fullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw new Error('unsupported');}
    catch(e){document.querySelector('#notice').textContent='当前环境暂不支持全屏，可继续使用窗口放映。';setTimeout(()=>document.querySelector('#notice').textContent='',4500);}
  }
  document.querySelector('#prev').onclick=()=>show(current-1);document.querySelector('#next').onclick=()=>show(current+1);
  document.querySelector('#fullscreen').onclick=fullscreen;document.querySelector('#helpButton').onclick=()=>help();
  addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(e.target.closest('button')&&[' ','Enter'].includes(e.key))return;
    let handled=true;
    if(['ArrowRight','PageDown',' '].includes(e.key))show(current+1);
    else if(['ArrowLeft','PageUp'].includes(e.key))show(current-1);
    else if(e.key==='Home')show(0);else if(e.key==='End')show(slides.length-1);
    else if(e.key.toLowerCase()==='f')fullscreen();else if(e.key==='?')help();else if(e.key==='Escape')help(false);else handled=false;
    if(handled)e.preventDefault();
  });
  addEventListener('hashchange',()=>show(readHash()));addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
  new ResizeObserver(resize).observe(stage);show(readHash());resize();
  window.templateReady=Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode())]).then(()=>{resize();return true;});
  window.slidePlayer={show,get current(){return current;}};
})();
