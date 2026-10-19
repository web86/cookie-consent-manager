"""Four fresh official MODX 3 sites with independent databases; never reset old fixtures."""
from pathlib import Path
import json,secrets,shutil
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/'.local/modx3-first-public'
def prepare():
 cases=[]
 for i,version in enumerate(['3.1.2','3.2.4']):
  for j,php in enumerate(['8.1','8.2']):
   name='m'+version.replace('.','')+'p'+php.replace('.','');c=dict(name=name,modx=version+'-pl',php=php,port=23120+i*2+j)
   f=LOCAL/name
   if f.exists():raise RuntimeError('Existing fixture preserved: '+name)
   private=f/'private';private.mkdir(parents=True);(private/'disposable-marker').write_text(name+'\n')
   (private/'compose.env').write_text('CC_MATRIX_PASSWORD='+secrets.token_hex(24)+'\n');(private/'compose.env').chmod(0o600)
   shutil.copytree(ROOT/'.local/modx3-matrix/download'/('modx-'+version+'-pl'),f/'site');(f/'evidence').mkdir()
   image='cookie-consent-modx3-php81:local' if php=='8.1' else 'cookie-consent-matrix-php82:local'
   (f/'compose.yaml').write_text(f'''name: cc3-first-public-{name}
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
    ports: ['127.0.0.1:{c['port']}:80']
    depends_on:
      db: {{condition: service_healthy}}
    volumes:
      - ./site:/var/www/html
      - ./private:/opt/cc-private
      - {ROOT}:/opt/cc-source:ro
      - {LOCAL}:/opt/cc-matrix
      - {ROOT/'tests/modx3/php82.ini'}:/usr/local/etc/php/conf.d/cc-matrix.ini:ro
    environment:
      CC_MATRIX_CASE: {name}
      CC_MATRIX_MODX: {version}-pl
      CC_MATRIX_PORT: '{c['port']}'
      CC_MATRIX_PASSWORD: ${{CC_MATRIX_PASSWORD:?}}
      COOKIE_CONSENT_LOCAL_HTTP: '1'
volumes:
  database:
networks:
  default:
    ipam:
      config:
        - subnet: 10.220.{20+i*2+j}.0/24
''');cases.append(c)
 (LOCAL/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
if __name__=='__main__':prepare()
