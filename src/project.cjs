const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function args(values=process.argv.slice(2)) {
  const result={};
  for(let i=0;i<values.length;i++){
    if(!values[i].startsWith('--'))throw new Error(`无法识别的参数：${values[i]}`);
    const key=values[i].slice(2);if(!values[i+1]||values[i+1].startsWith('--'))throw new Error(`参数 --${key} 缺少值`);result[key]=values[++i];
  }
  return result;
}
function loadProject(overrides={}) {
  const configPath=path.resolve(overrides.config||path.join(ROOT,'config','project.json'));
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const root=path.resolve(path.dirname(configPath),'..');
  const absolute=p=>p?path.resolve(root,p):null;
  config.logoPath=overrides.logo?path.resolve(overrides.logo):absolute(config.logos.color);
  config.reversePath=overrides['reverse-logo']?path.resolve(overrides['reverse-logo']):overrides.logo?null:absolute(config.logos.reverse);
  config.school=overrides.school||(overrides.logo?'自定义学校':config.school);
  config.theme={...config.theme,primary:overrides.primary||config.theme.primary};
  config.contentPath=overrides.content?path.resolve(overrides.content):absolute(config.content);
  config.fontPath=absolute(config.fonts.source);
  config.outputPath=overrides.out?path.resolve(overrides.out):absolute(config.outputDirectory);
  config.name=overrides.name||config.outputName;
  if(!config.name || /[\\/:*?"<>|]/.test(config.name)) throw new Error('输出名称不能包含路径或特殊字符。');
  if(!fs.existsSync(config.logoPath)) throw new Error(`找不到校徽：${config.logoPath}`);
  config.content=JSON.parse(fs.readFileSync(config.contentPath,'utf8'));
  if(!Array.isArray(config.content.slides)||!config.content.slides.length)throw new Error('content.slides 必须是非空数组。');
  config.root=root;
  return config;
}
function createRunDirectory(base,name) {
  fs.mkdirSync(base,{recursive:true});
  let candidate=path.join(base,name),i=2;
  while(fs.existsSync(candidate))candidate=path.join(base,`${name}-${i++}`);
  fs.mkdirSync(candidate);return candidate;
}
module.exports={ROOT,args,loadProject,createRunDirectory};
