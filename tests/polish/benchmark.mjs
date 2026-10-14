// Immutable 1.0.0 versus local candidate, same disposable data; no client deployment.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {docker} from '../helpers.mjs';
try{
 for(const [phase,signature]of [['before','cookieconsent-1.0.0'],['after','cookieconsent-1.0.1']]){
  execFileSync('docker',['compose','--env-file','.local/modx3/private/compose.env','-f','tests/local/compose.yaml','restart','web'],{stdio:'pipe'});
  execFileSync('node',['tests/transport/install-current.mjs'],{stdio:'pipe',env:{...process.env,CC_INSTALL_SERVICES:'web',CC_INSTALL_SIGNATURE:signature}});
  docker(['web','cp','/opt/cc-source/tests/polish/endpoint.php','/var/www/html/polish-benchmark.php']);
  writeFileSync('.local/modx3/polish-evidence/php-'+phase+'.json',docker(['web','php','/opt/cc-source/tests/polish/performance.php']));
  execFileSync('node',['tests/polish/http-performance.mjs',phase],{stdio:'pipe'});
  execFileSync('node',['tests/polish/network.mjs',phase],{stdio:'pipe'});
  console.log('PASS benchmark '+phase+' '+signature);
 }
}finally{docker(['web','rm','-f','/var/www/html/polish-benchmark.php']);}
