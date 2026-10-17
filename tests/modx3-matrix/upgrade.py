"""Official CMS upgrade in a previously accepted 3.1.2 disposable fixture."""
import json
import shutil
import subprocess
import sys
from driver import compose
from prepare import LOCAL

cases=json.loads((LOCAL/'cases.json').read_text())
for case in [c for c in cases if c['name'] in sys.argv[1:]]:
    if not case['name'].startswith('m312'): raise RuntimeError('3.1.2 case required')
    fixture=LOCAL/case['name']
    report=json.loads((fixture/'evidence/browser.json').read_text())
    expected=4 if report.get('nativeOnly') else 23
    if report['failed'] or report['tests']!=expected: raise RuntimeError('Complete matrix acceptance required first')
    continuing='--continue' in sys.argv
    if (fixture/'evidence/cms-before.json').exists() and not continuing: raise RuntimeError('Upgrade already started; preserve evidence')
    compose(case,'up','-d')
    def cli(op):
        return compose(case,'exec','-T','web','php','/opt/cc-source/tests/modx3-matrix/fixture.php',op,capture_output=True,text=True).stdout
    cli('cache')
    compose(case,'exec','-T','web','php','/opt/cc-source/tests/modx3-matrix/fixture.php','aliases','off',stdout=subprocess.DEVNULL)
    if continuing:
        if json.loads(cli('snapshot'))!=json.loads((fixture/'evidence/cms-before.json').read_text()): raise RuntimeError('Pre-upgrade state changed')
    else:
        (fixture/'evidence/cms-before.json').write_text(cli('snapshot'))
        (fixture/'evidence/cms-before-key.json').write_text(cli('audit-queue'))
        shutil.copyfile(fixture/'evidence/browser.json',fixture/'evidence/browser-before-cms-upgrade.json')
    dump=fixture/'private/database-before-cms-upgrade.sql'
    if not dump.exists():
        with dump.open('wb') as stream:
            compose(case,'exec','-T','db','sh','-ec','exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --databases cc3_matrix_'+case['name'],stdout=stream,stderr=subprocess.DEVNULL)
    dump.chmod(0o600)
    compose(case,'stop','web')
    # Official distribution has no active config.inc.php; no component files are touched.
    source=LOCAL/'download/modx-3.2.4-pl'
    shutil.copytree(source,fixture/'site',dirs_exist_ok=True,
                    ignore=lambda directory,names:[n for n in names if n in ['config.core.php','config.inc.php']])
    path=fixture/'compose.yaml'
    path.write_text(path.read_text().replace('CC_MATRIX_MODX: 3.1.2-pl','CC_MATRIX_MODX: 3.2.4-pl'))
    compose(case,'up','-d','web')
    cli('upgrade-config')
    with (fixture/'evidence/cms-upgrade.log').open('w') as log:
        compose(case,'exec','-T','-w','/var/www/html/setup','web','php','index.php','--installmode=upgrade','--config=/opt/cc-private/upgrade.xml',stdout=log,stderr=log)
        info=cli('upgrade-finish')
        (fixture/'evidence/cms-after-info.json').write_text(info)
    after=cli('snapshot')
    key=cli('audit-queue')
    (fixture/'evidence/cms-after-key.json').write_text(key)
    if (fixture/'evidence/cms-before-key.json').exists() and json.loads(key)!=json.loads((fixture/'evidence/cms-before-key.json').read_text()): raise RuntimeError('CMS changed audit queue/key')
    (fixture/'evidence/cms-after.json').write_text(after)
    if json.loads(after)!=json.loads((fixture/'evidence/cms-before.json').read_text()):
        raise RuntimeError('CMS upgrade changed component settings/data/adapters/element IDs')
    print('CMS upgrade preserved full snapshot:',case['name'],info,flush=True)
