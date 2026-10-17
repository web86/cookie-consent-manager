"""Commands are restricted to the newly generated case-specific compose files."""
from pathlib import Path
import json
import os
import subprocess
import sys
from prepare import ROOT, LOCAL

def compose(case, *args, **kwargs):
    fixture = LOCAL / case['name']
    return subprocess.run(['docker', 'compose', '--env-file', str(fixture/'private/compose.env'),
                           '-f', str(fixture/'compose.yaml'), *args], cwd=ROOT, check=True, **kwargs)

def setup(case):
    fixture = LOCAL/case['name']
    if (fixture/'evidence/setup-info.json').exists():
        raise RuntimeError('Already installed; preserve fixture')
    with (fixture/'evidence/setup.log').open('a') as log:
        compose(case, 'up', '-d', stdout=log, stderr=log)
        action='verify-prepared' if (fixture/'private/setup.xml').exists() else 'prepare'
        compose(case, 'exec', '-T', 'web', 'php', '/opt/cc-source/tests/modx2-compatibility/fixture.php', action, stdout=log, stderr=log)
        compose(case, 'exec', '-T', '-w', '/var/www/html/setup', 'web', 'php', 'index.php', '--installmode=new', '--config=/opt/cc-private/setup.xml', stdout=log, stderr=log)
        info=compose(case, 'exec', '-T', 'web', 'php', '/opt/cc-source/tests/modx2-compatibility/fixture.php', 'finish', capture_output=True, text=True)
        json.loads(info.stdout)
        (fixture/'evidence/setup-info.json').write_text(info.stdout+'\n')

if __name__ == '__main__':
    mode=sys.argv[1]
    cases=json.loads((LOCAL/('final-cases.json' if os.environ.get('CC_MATRIX_FINAL') else 'cases.json')).read_text())
    for case in cases:
        if len(sys.argv)>2 and case['name'] not in sys.argv[2:]: continue
        print(mode,case['name'],flush=True)
        if mode in ['setup','provision']:
            setup(case)
            if mode=='provision': compose(case,'stop',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        elif mode=='start': compose(case,'up','-d')
        elif mode=='stop': compose(case,'stop')
        elif mode=='archive':
            fixture=LOCAL/case['name']
            final=case['name'].endswith('final')
            report=json.loads((fixture/('evidence/final.json' if final else 'evidence/browser.json')).read_text())
            expected=4 if final else 13
            if report['failed'] or report['tests']!=expected: raise RuntimeError('Only completed cases can be archived')
            logs=compose(case,'logs','--no-color',capture_output=True,text=True)
            with (fixture/'evidence/docker-preserved.log').open('a') as stream: stream.write(logs.stdout)
            # Deliberately no --volumes, --rmi or global network prune.
            compose(case,'down')
        else: raise ValueError(mode)
