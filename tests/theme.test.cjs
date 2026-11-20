const test=require('node:test');
const assert=require('node:assert/strict');
const {dependency}=require('../src/dependencies.cjs');
const {extractTheme,makeTokens,contrast}=require('../src/theme.cjs');
const {createRunDirectory}=require('../src/project.cjs');
const sharp=dependency('sharp');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
async function pixels(width,height,paint){const b=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=paint(x,y);b.set(c,4*(y*width+x));}return sharp(b,{raw:{width,height,channels:4}}).png().toBuffer();}
test('large black lettering and a white background do not replace the chromatic emblem',async()=>{
  const input=await pixels(160,100,(x,y)=>x<105?[18,18,18,255]:y<40?[0,85,155,255]:[255,255,255,255]);
  const p=await extractTheme(input);assert.equal(p.selectedPrimary,'#00559B');assert.equal(p.selection,'image');
});
test('transparent colored pixels and a tiny saturated speck are excluded',async()=>{
  const input=await pixels(100,100,(x,y)=>x===99&&y===99?[0,255,0,255]:x>59?[255,0,255,0]:[154,0,0,255]);
  const p=await extractTheme(input);assert.equal(p.selectedPrimary,'#9A0000');assert.equal(p.status,'extracted');
});
test('nearby anti-aliased shades are grouped rather than reported as competing colors',async()=>{
  const input=await pixels(100,100,(x,y)=>x<50?[154,0,0,255]:[157,3,3,255]);
  const p=await extractTheme(input);assert.equal(p.candidates.length,1);assert.equal(p.status,'extracted');
});
test('two substantial chromatic colors produce ambiguity and ranked candidates',async()=>{
  const input=await pixels(100,100,(x,y)=>x<60?[20,70,170,255]:[170,20,20,255]);
  const p=await extractTheme(input);assert.equal(p.status,'ambiguous');assert.equal(p.candidates.length,2);assert.equal(p.selectedPrimary,'#1446AA');
});
test('black and white artwork uses a marked neutral draft, never a guessed school color',async()=>{
  const p=await extractTheme(await pixels(100,100,(x,y)=>x<50?[0,0,0,255]:[255,255,255,255]));
  assert.equal(p.status,'monochrome');assert.equal(p.extractedPrimary,null);assert.equal(p.selection,'neutral-fallback');
});
test('a nearly empty transparent image does not claim a reliable color',async()=>{
  const p=await extractTheme(await pixels(20,20,()=>[0,0,0,0]));assert.equal(p.status,'insufficient');assert.equal(p.extractedPrimary,null);
});
test('bright yellow keeps its original primary but derives readable text and foreground',()=>{
  const p=makeTokens('#FFD700');assert.equal(p.primary,'#FFD700');assert.ok(contrast(p.primaryText,'#FFFFFF')>=4.5);assert.ok(contrast(p.primary,p.onPrimary)>=4.5);
});
test('manual override takes priority while preserving the measured and official values',async()=>{
  const p=await extractTheme(await pixels(30,30,()=>[154,0,0,255]),{primary:'#005588',officialPrimary:'#94070A'});
  assert.equal(p.selectedPrimary,'#005588');assert.equal(p.extractedPrimary,'#9A0000');assert.equal(p.officialPrimary,'#94070A');assert.equal(p.selection,'manual');
});
test('invalid override fails instead of silently producing an unusable theme',async()=>{
  await assert.rejects(extractTheme(Buffer.from([]),{primary:'red'}),/#RRGGBB/);
});
test('a new generation preserves an existing output version',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'university-slides-test-'));
  try{const first=createRunDirectory(base,'sample');fs.writeFileSync(path.join(first,'keep.txt'),'keep');const next=createRunDirectory(base,'sample');assert.notEqual(first,next);assert.equal(fs.readFileSync(path.join(first,'keep.txt'),'utf8'),'keep');}
  finally{const target=path.resolve(base);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('university-slides-test-'));fs.rmSync(target,{recursive:true,force:true});}
});
test('changing the emblem recolors both actual output files through the shared model',async()=>{
  const {spawnSync}=require('node:child_process');
  const project=path.resolve(__dirname,'..');
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'university-slides-test-'));
  try{
    const logo=path.join(base,'color-fixture.png');
    fs.writeFileSync(logo,await pixels(160,100,(x,y)=>x<105?[10,10,10,255]:[18,94,160,255]));
    const build=spawnSync(process.execPath,[path.join(project,'scripts','build.cjs'),'--logo',logo,'--school','TEST FIXTURE','--out',base,'--name','integration'],{cwd:project,encoding:'utf8',windowsHide:true});
    assert.equal(build.status,0,build.stderr);
    const run=path.join(base,'integration');
    const palette=JSON.parse(fs.readFileSync(path.join(run,'palette.json'),'utf8'));
    assert.equal(palette.selectedPrimary,'#125EA0');assert.equal(palette.selection,'image');
    assert.ok(fs.readFileSync(path.join(run,'汇报模板.html'),'utf8').includes('--color:#125EA0'));
    const probe=spawnSync(process.env.PYTHON||'python',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); data="".join(z.read(n).decode() for n in z.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")); assert "125EA0" in data; print("pptx-theme-ok")',path.join(run,'汇报模板.pptx')],{encoding:'utf8',windowsHide:true});
    assert.equal(probe.status,0,probe.stderr);
  }finally{const target=path.resolve(base);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('university-slides-test-'));fs.rmSync(target,{recursive:true,force:true});}
});
