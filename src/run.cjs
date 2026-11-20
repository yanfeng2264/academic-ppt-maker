const fs=require('node:fs');
const path=require('node:path');
const {ROOT}=require('./project.cjs');
function findRun(given){
  const base=path.join(ROOT,'output');
  const run=given?path.resolve(given):path.resolve(base,JSON.parse(fs.readFileSync(path.join(base,'latest.json'),'utf8')).runDirectory);
  const manifest=JSON.parse(fs.readFileSync(path.join(run,'manifest.json'),'utf8'));
  return {run,manifest};
}
function saveManifest(run,manifest){fs.writeFileSync(path.join(run,'manifest.json'),JSON.stringify(manifest,null,2));}
module.exports={findRun,saveManifest};
