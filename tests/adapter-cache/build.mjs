import {execFileSync} from 'node:child_process';
process.stdout.write(execFileSync('python3',['tests/modstore/static.py'],{encoding:'utf8'}));
