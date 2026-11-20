const runs=value=>(value.match(/[A-Za-z]+(?:[ ./'’-]+[A-Za-z]+)*|[^A-Za-z]+/g)||[]).map(value=>({value,latin:/[A-Za-z]/.test(value)}));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
module.exports={runs,escape};
