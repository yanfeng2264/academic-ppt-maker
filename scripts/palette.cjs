const {args,loadProject}=require('../src/project.cjs');
const {extractTheme}=require('../src/theme.cjs');
async function main(){const config=loadProject(args());const theme=await extractTheme(config.logoPath,config.theme);console.log(JSON.stringify(theme,null,2));}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
