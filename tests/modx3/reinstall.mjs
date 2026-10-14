import {chromium} from 'playwright';import {manager} from './helpers.mjs';import {readFileSync} from 'node:fs';
const meta=JSON.parse(readFileSync('_build/package.json')),signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;
const browser=await chromium.launch();const s=await manager(browser);
try{const r=await s.core('workspace/packages/install',{signature});if(!r.success)throw Error(JSON.stringify(r));console.log('PASS native reinstall');}finally{await s.ctx.close();await browser.close();}
