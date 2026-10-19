"""Create new disposable sites; refuse existing paths and preserve all prior evidence."""
from pathlib import Path
import json, secrets, shutil, sys
ROOT=Path(__file__).resolve().parents[2]
LOCAL=ROOT/'.local/package-rename'

def prepare():
    final="--final" in sys.argv
    cases=[]
    for j,version in enumerate(['2.8.4','2.8.8']):
        for i,php in enumerate(['8.1','8.2']):
            for fresh in [False,True]:
                name='rename-'+version.replace('.','')[1:]+'-p'+php.replace('.','')+('-fresh' if fresh else '')+('-final' if final else '')
                case=dict(name=name,modx=version+'-pl',php=php,port=22940+j*4+i*2+int(fresh)+(20 if final else 0)+(20 if final else 0),fresh=fresh)
                fixture=LOCAL/name
                if fixture.exists():raise RuntimeError('Existing fixture preserved: '+name)
                private=fixture/'private';private.mkdir(parents=True)
                (private/'disposable-marker').write_text(name+'\n')
                (private/'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n');(private/'compose.env').chmod(0o600)
                shutil.copytree(ROOT/'.local/modx2-compatibility/download'/('modx-'+version+'-pl'),fixture/'site')
                (fixture/'evidence').mkdir()
                image='cookie-consent-modx3-php81:local' if php=='8.1' else 'cookie-consent-matrix-php82:local'
                (fixture/'compose.yaml').write_text(f'''name: cc2-{name}
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
      CC_MATRIX_MODX: {version}-pl
      CC_MATRIX_PORT: '{case['port']}'
      CC_MATRIX_PASSWORD: ${{CC_MATRIX_PASSWORD:?}}
      COOKIE_CONSENT_LOCAL_HTTP: '1'
volumes:
  database:
networks:
  default:
    ipam:
      config:
        - subnet: 10.219.{40+j*4+i*2+int(fresh)+(20 if final else 0)}.0/24
''')
                cases.append(case)
    (LOCAL/('final-cases.json' if final else 'cases.json')).write_text(json.dumps([c for c in cases if not c['fresh']],indent=2)+'\n')
    (LOCAL/('final-all-cases.json' if final else 'all-cases.json')).write_text(json.dumps(cases,indent=2)+'\n')
    prior=LOCAL/'artifacts/prior';prior.mkdir(parents=True,exist_ok=True)
    for p in (ROOT/'.local/modx2-compatibility/artifacts/release').glob('cookieconsent-1.0.8-pl3.*'):
        if p.is_file():shutil.copyfile(p,prior/p.name)

if __name__=='__main__':prepare()
