const { dependency } = require('./dependencies.cjs');
const sharp = dependency('sharp');
const rgb = hex => hex.replace('#', '').match(/../g).map(v => parseInt(v, 16));
const hex = values => '#' + values.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v * (1 - t) + rgb(b)[i] * t));
function luminance(color) {
  const a = rgb(color).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * a[0] + .7152 * a[1] + .0722 * a[2];
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function lab(values) {
  const [r,g,b] = values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047), y=f(.2126729*r+.7151522*g+.072175*b), z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
const distance = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
function makeTokens(primary) {
  let primaryText = primary;
  for (let i = 0; contrast(primaryText, '#FFFFFF') < 4.5 && i < 40; i++) primaryText = mix(primaryText, '#000000', .08);
  let deep = mix(primary, '#000000', .2);
  for (let i = 0; contrast(deep, '#FFFFFF') < 4.5 && i < 40; i++) deep = mix(deep, '#000000', .08);
  const onPrimary = contrast(primary, '#FFFFFF') >= contrast(primary, '#242424') ? '#FFFFFF' : '#242424';
  return {
    primary, primaryText, deep, pale: mix(primary, '#FFFFFF', .94), soft: mix(primary, '#FFFFFF', .84),
    text: '#242424', muted: '#626262', surface: '#FFFFFF', neutralSurface: '#F5F5F4', onPrimary,
    checks: {primaryTextOnWhite: +contrast(primaryText, '#FFFFFF').toFixed(2), onPrimary: +contrast(primary, onPrimary).toFixed(2)}
  };
}
async function extractTheme(input, options = {}) {
  for (const field of ['primary', 'officialPrimary']) if (options[field] != null && !validHex(options[field])) throw new Error(`${field} 必须是 #RRGGBB 色值。`);
  const { data, info } = await sharp(input).rotate().toColourspace('srgb').resize({width:384,height:384,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const histogram = new Map(); let visible = 0, eligible = 0;
  for (let i=0;i<data.length;i+=info.channels) {
    const [r,g,b,a] = data.subarray(i,i+4); if(a<230) continue; visible++;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?(max-min)/max:0;
    if(min>242 || max<42 || sat<.22 || max-min<25) continue;
    eligible++; const color=hex([r,g,b]); histogram.set(color,(histogram.get(color)||0)+1);
  }
  const clusters=[];
  for(const [color,count] of [...histogram].sort((a,b)=>b[1]-a[1])) {
    const l=lab(rgb(color)); let target=null, best=16;
    for(const c of clusters){const d=distance(l,c.lab);if(d<best){best=d;target=c;}}
    if(target){const total=target.count+count;target.lab=target.lab.map((v,i)=>(v*target.count+l[i]*count)/total);target.count=total;}
    else clusters.push({color,count,lab:l});
  }
  clusters.sort((a,b)=>b.count-a.count);
  const enough=eligible>=Math.max(12,visible*.0005);
  const candidates=enough?clusters.filter(c=>c.count/eligible>=.035).slice(0,5).map(c=>({color:c.color,share:+(c.count/eligible).toFixed(4),pixels:c.count})):[];
  const ambiguous=candidates.length>1 && candidates[1].share>=.22 && distance(lab(rgb(candidates[0].color)),lab(rgb(candidates[1].color)))>22;
  let status=!enough?(visible<30?'insufficient':'monochrome'):ambiguous?'ambiguous':'extracted';
  const extractedPrimary=candidates[0]?.color||null;
  let selectedPrimary=extractedPrimary||'#55585F',selection=extractedPrimary?'image':'neutral-fallback';
  if(options.primary){selectedPrimary=options.primary.toUpperCase();selection='manual';status='manual';}
  else if(options.officialPrimary){selectedPrimary=options.officialPrimary.toUpperCase();selection='official';status='official';}
  return {
    status, selection, extractedPrimary, selectedPrimary, officialPrimary:options.officialPrimary||null,
    candidates, visiblePixels:visible, chromaticPixels:eligible,
    note:!enough?'未能从标识可靠推断彩色主色，使用明确标注的中性灰草稿。':ambiguous?'检测到多个明显主色，默认推荐面积最大的候选；可手动覆盖。':'从校徽彩色区域提取，已排除透明、近白和黑灰文字。',
    tokens:makeTokens(selectedPrimary)
  };
}
module.exports={extractTheme,makeTokens,contrast,mix,validHex};
