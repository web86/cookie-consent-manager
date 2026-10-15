#!/usr/bin/env python3
"""Clone only the existing disposable MODX 2 fixture into a separate DB/site.
Requires the local acceptance Docker image/database; never accepts a remote URL.
"""
from pathlib import Path
import json
import shutil
import subprocess

root = Path(__file__).resolve().parents[2]
local = root / '.local'
target = local / 'fenom'
pdo_sha = 'a7a9a3366249c6689cefba5c2b901ada43a7df79'
pdo = local / 'download' / ('pdoTools-' + pdo_sha)
assert (pdo / 'core/components/pdotools/vendor/autoload.php').is_file(), 'Install locked upstream Fenom dependency first; see README'
marker = target / 'private/disposable-fenom.json'
if not marker.exists():
    assert not target.exists(), 'Refuse to overwrite an unmarked directory'
    target.mkdir()
    shutil.copytree(local / 'site', target / 'site')
    shutil.copytree(local / 'private/core', target / 'private/core',
                    ignore=lambda path, names: [n for n in names if Path(path) == local / 'private/core' and n in ('cache', 'packages', 'logs')])
    (target / 'private/core/cache').mkdir()
    config = target / 'private/core/config/config.inc.php'
    config.write_text(config.read_text().replace('cookie_consent_test', 'cookie_consent_fenom').replace(':8888', ':18988'))
    db = 'cookie-consent-acceptance-db-1'
    def mysql(command):
        return subprocess.run(['docker', 'exec', db, 'sh', '-c',
            'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "$1"', 'sh', command], check=True)
    # Fail if that database already exists; never drop/reset another fixture.
    mysql('CREATE DATABASE cookie_consent_fenom CHARACTER SET utf8mb4')
    dump = subprocess.Popen(['docker', 'exec', db, 'sh', '-c',
        'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction cookie_consent_test'], stdout=subprocess.PIPE)
    load = subprocess.run(['docker', 'exec', '-i', db, 'sh', '-c',
        'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" cookie_consent_fenom'], stdin=dump.stdout)
    dump.stdout.close()
    assert dump.wait() == 0 and load.returncode == 0
    marker.write_text(json.dumps({'fixture': 'cookie-consent-fenom', 'database': 'cookie_consent_fenom', 'pdoTools': pdo_sha}))
assert json.loads(marker.read_text()) == {'fixture': 'cookie-consent-fenom', 'database': 'cookie_consent_fenom', 'pdoTools': pdo_sha}, 'Unexpected fixture marker'
(target / 'private/baseline-assets.php').write_bytes(subprocess.check_output(['git', 'show', '44e4fef:server/modx2-assets-snippet.php'], cwd=root))
shutil.copytree(pdo / 'core/components/pdotools', target / 'private/core/components/pdotools', dirs_exist_ok=True)
shutil.copytree(root / 'server/src', target / 'private/core/components/cookieconsent/src', dirs_exist_ok=True)
shutil.copytree(root / 'server/lexicon', target / 'private/core/components/cookieconsent/lexicon', dirs_exist_ok=True)
shutil.copytree(root / 'assets', target / 'site/assets', dirs_exist_ok=True)
# Real MODX front controller; context selection exists only in the disposable fixture.
(target / 'site/fenom.php').write_text('''<?php
require __DIR__.'/config.core.php';
require MODX_CORE_PATH.'model/modx/modx.class.php';
$context=$_GET['ctx']??'fenom-en';
if(!in_array($context,['fenom-en','fenom-ru'],true)){http_response_code(400);exit;}
$modx=new modX();$modx->initialize($context);$modx->handleRequest();
''')
print('Isolated Fenom clone prepared; no existing fixture or production state modified')
