"""Only 2.8.4 is installed: independent disposable DB volumes and loopback ports."""
import json
import secrets
import shutil
import sys
from audit import ROOT, LOCAL

def prepare():
    final='--final' in sys.argv
    cases=[]
    for i, php in enumerate(['8.1', '8.2']):
        name='m284p'+php.replace('.', '')+('final' if final else '')
        case=dict(name=name, modx='2.8.4-pl', php=php, port=22840+i+(2 if final else 0))
        fixture=LOCAL/name
        if fixture.exists():
            raise RuntimeError('Existing fixture preserved: '+name)
        private=fixture/'private'
        private.mkdir(parents=True)
        (private/'disposable-marker').write_text(name+'\n')
        (private/'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n')
        (private/'compose.env').chmod(0o600)
        shutil.copytree(LOCAL/'download/modx-2.8.4-pl', fixture/'site')
        (fixture/'evidence').mkdir()
        image='cookie-consent-modx3-php81:local' if php=='8.1' else 'cookie-consent-matrix-php82:local'
        (fixture/'compose.yaml').write_text(f'''name: cc2-compat-{name}
services:
  db:
    image: mariadb:10.6
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
    environment:
      CC_MATRIX_CASE: {name}
      CC_MATRIX_MODX: 2.8.4-pl
      CC_MATRIX_PORT: '{case['port']}'
      CC_MATRIX_PASSWORD: ${{CC_MATRIX_PASSWORD:?}}
      COOKIE_CONSENT_LOCAL_HTTP: '1'
volumes:
  database:
''')
        cases.append(case)
    (LOCAL/('final-cases.json' if final else 'cases.json')).write_text(json.dumps(cases,indent=2)+'\n')
    print('Prepared two independent MODX 2.8.4 fixtures')

if __name__=='__main__':
    prepare()
