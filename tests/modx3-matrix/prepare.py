"""New, independent loopback-only fixtures. Never reuse another project's data."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / os.environ.get('CC_MATRIX_DIRECTORY', '.local/modx3-matrix')
VERSIONS = ['3.1.2', '3.2.0', '3.2.1', '3.2.2', '3.2.3', '3.2.4']

def archives():
    result = []
    for version in VERSIONS:
        archive = LOCAL / f'download/modx-{version}-pl.zip'
        source = archive.parent / f'modx-{version}-pl'
        with zipfile.ZipFile(archive) as z:
            for name in z.namelist():
                if not (archive.parent / name).resolve().is_relative_to(archive.parent.resolve()):
                    raise RuntimeError('Archive traversal')
            if not source.exists():
                z.extractall(archive.parent)
        installed = json.loads((source / 'core/vendor/composer/installed.json').read_text())
        packages = installed.get('packages', installed) if isinstance(installed, dict) else installed
        xpdo = next(p for p in packages if p['name'] == 'xpdo/xpdo')
        result.append(dict(modx=version+'-pl', xpdo=xpdo['version'], xpdo_reference=xpdo.get('source', {}).get('reference'),
                           sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                           url=f'https://modx.s3.amazonaws.com/releases/{version}/modx-{version}-pl.zip'))
    (LOCAL / 'archives.json').write_text(json.dumps(result, indent=2)+'\n')
    return result

def prepare():
    archives()
    cases = []
    for i, version in enumerate(VERSIONS):
        for j, php in enumerate(['8.1', '8.2']):
            name = 'm'+version.replace('.', '')+'p'+php.replace('.', '')
            case = dict(name=name, modx=version+'-pl', php=php, port=int(os.environ.get('CC_MATRIX_PORT_BASE','21800'))+i*2+j)
            fixture = LOCAL / name
            if fixture.exists():
                raise RuntimeError('Fixture exists; preserve evidence: '+name)
            private = fixture / 'private'
            private.mkdir(parents=True)
            (private / 'disposable-marker').write_text(name+'\n')
            (private / 'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n')
            (private / 'compose.env').chmod(0o600)
            shutil.copytree(LOCAL / f'download/modx-{version}-pl', fixture / 'site')
            (fixture / 'evidence').mkdir()
            image = 'cookie-consent-modx3-php81:local' if php == '8.1' else 'cookie-consent-matrix-php82:local'
            # Each case has its own DB container and named volume, not merely a table prefix.
            (fixture / 'compose.yaml').write_text(f'''name: {os.environ.get('CC_MATRIX_PROJECT_PREFIX','cc3-matrix')}-{name}
services:
  db:
    image: mariadb:11.8
    environment:
      MARIADB_ROOT_PASSWORD: ${{CC_MATRIX_PASSWORD:?}}
    volumes: [database:/var/lib/mysql]
    healthcheck:
      test: [CMD, healthcheck.sh, --connect, --innodb_initialized]
      interval: 2s
      timeout: 5s
      retries: 40
  web:
    image: {image}
    ports: ['127.0.0.1:{case['port']}:80']
    depends_on:
      db: {{condition: service_healthy}}
    volumes:
      - ./site:/var/www/html
      - ./private:/opt/cc-private
      - {ROOT}:/opt/cc-source:ro
      - {LOCAL}:/opt/cc-matrix
      - {ROOT / 'tests/modx3/php82.ini'}:/usr/local/etc/php/conf.d/cc-matrix.ini:ro
    environment:
      CC_MATRIX_CASE: {name}
      CC_MATRIX_MODX: {case['modx']}
      CC_MATRIX_PORT: '{case['port']}'
      CC_MATRIX_PASSWORD: ${{CC_MATRIX_PASSWORD:?}}
      COOKIE_CONSENT_LOCAL_HTTP: '1'
volumes:
  database:
''')
            cases.append(case)
    (LOCAL / 'cases.json').write_text(json.dumps(cases, indent=2)+'\n')
    print('Prepared', len(cases), 'independent fixtures')

if __name__ == '__main__':
    import sys
    archives() if '--archives-only' in sys.argv else prepare()
