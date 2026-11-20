const path = require('node:path');
const os = require('node:os');
function dependency(name) {
  try { return require(name); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  const runtime = path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
  try { return require(path.join(runtime, name)); }
  catch (e) { throw new Error(`缺少依赖 ${name}。请在项目目录执行 npm install。原始错误：${e.message}`); }
}
module.exports = { dependency };
