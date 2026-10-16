/** Local acceptance orchestration: build the release prebuilt before native packaging. */
import {execFileSync} from 'node:child_process';
const [site,out,index]=process.argv.slice(2);if(!site||!out)throw Error('Usage: node _build/transport.mjs /site /container-build-output [beta-index]');
execFileSync(process.execPath,['_build/version.mjs',...(index?[index]:[])],{stdio:'inherit'});
execFileSync(process.execPath,['_build/user-guide.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['_build/frontend.mjs'],{stdio:'inherit'});
execFileSync('docker',['compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','exec','-T','web','php','/opt/cc-source/_build/build.php',site,out,...(index?[index]:[])],{stdio:'inherit'});
