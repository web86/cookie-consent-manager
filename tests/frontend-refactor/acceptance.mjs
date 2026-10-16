// Run against the repository's named disposable MODX 2 fixtures only.
// Suites share DBs, so mutations and native lifecycle steps remain sequential.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';

const out=process.env.CC_REFACTOR_EVIDENCE||'.local/service-adapters/acceptance';
mkdirSync(out,{recursive:true});
const results=[];
function run(name,command,args,env={},evidence=[]) {
  console.log('RUN '+name);
  let output='',status='PASS';
  try {output=execFileSync(command,args,{encoding:'utf8',env:{...process.env,...env},maxBuffer:32*1024*1024});}
  catch(error) {output=(error.stdout||'')+(error.stderr||'');status='FAIL';process.exitCode=1;}
  writeFileSync(out+'/'+name+'.log',output);
  const reports=[];
  for(const path of evidence) if(existsSync(path)) {
    const destination=out+'/'+name+'-'+path.split('/').at(-1);
    copyFileSync(path,destination);reports.push(destination);
  }
  results.push({name,result:status,reports});
  writeFileSync(out+'/results.json',JSON.stringify(results,null,2)+'\n');
  console.log(status+' '+name+(status==='FAIL'?'\n'+output.slice(-2400):''));
  return status==='PASS';
}
const node=(name,path,env={},evidence=[])=>run(name,process.execPath,[path],env,evidence);
const compose=['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','-f','tests/transport/compose.yaml'];
const meta=JSON.parse(readFileSync('_build/package.json'));
const signature=meta.name+'-'+meta.version+'-'+meta.release+meta.release_index;
if(process.argv.includes('--native')) {
  if(!run('reset-disposable','python3',['tests/transport/reset.py','clean','publiccore'])) throw Error('Fixture reset failed');
  if(!node('native','tests/beta33/native.mjs',{CC_EVIDENCE_DIR:out+'/native'},[out+'/native/native-results.json'])) throw Error('Native acceptance failed');
  if(!node('install-web','tests/transport/install-current.mjs',{CC_INSTALL_SERVICES:'web'})) throw Error('Candidate install failed');
}
if(process.argv.includes('--native-only')) process.exit(process.exitCode||0);
node('legacy-browser','tests/legacy-autoload/browser.mjs',{},['.local/legacy-autoload-evidence/browser.json']);
node('legacy-matrix','tests/legacy-autoload/matrix.mjs',{},['.local/legacy-autoload-evidence/matrix-results.json']);
node('beta1042','tests/beta1042/accept.mjs',{},['.local/beta1042-evidence/accept-results.json']);
node('universal','tests/universal/regression.mjs',{},['.local/universal-evidence/regression/results.json']);
node('public-registry-upgrade','tests/public-registry/browser.mjs',{},['.local/public-registry-evidence/browser-results.json']);
node('examples','tests/locale-guide/examples.mjs',{},['.local/locale-guide-evidence/examples.json']);
run('fenom-sync','docker',['exec','cookie-consent-acceptance-fenom-1','php','/opt/cc-source/tests/local/sync.php']);
node('fenom-browser','tests/fenom/acceptance.mjs',{},['.local/fenom/evidence/results.json']);
node('fenom-modes','tests/legacy-autoload/fenom.mjs',{},['.local/legacy-autoload-evidence/fenom.json']);
node('beta-upgrades','tests/legacy-autoload/upgrade.mjs',{},['.local/legacy-autoload-evidence/upgrade.json']);
node('direct-vendors','tests/legacy-autoload/direct-vendors.mjs',{},['.local/legacy-autoload-evidence/direct-vendors.json']);
node('manager','tests/manager.mjs');
if(process.argv.includes('--native')) {
  run('refresh-php81','docker',[...compose,'-f','tests/beta102/compose.yaml','up','-d','--force-recreate','--no-deps','beta81']);
  node('php81-native','tests/legacy-autoload/php81.mjs',{},['.local/legacy-autoload-evidence/php81.json']);
}
for(const [name,container] of [['php81','cookie-consent-acceptance-beta81-1'],['php82','cookie-consent-acceptance-web-1']]) {
  for(const [key,path] of Object.entries({categories:'tests/universal/php.php',audit:'tests/universal/audit-schema3.php',visibility:'tests/audit-visibility/php.php',urls:'tests/beta1042/urls.php'})) {
    run(name+'-'+key,'docker',['exec',container,'php','/opt/cc-source/'+path]);
  }
}
run('php-and-syntax','python3',['tests/fenom/regression.py'],{},['.local/fenom/evidence/regression.json']);
run('native-verifier','docker',[...compose,'exec','-T','web','php','/opt/cc-source/_build/verify.php','/opt/cc-source/.local/artifacts/'+signature+'.transport.zip']);
