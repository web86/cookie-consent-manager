"""Disposable local acceptance matrix; never reuses existing databases or sites."""
from pathlib import Path
import json,shutil,secrets,zipfile
ROOT=Path(__file__).resolve().parents[2]
REPO=ROOT.parents[1]
LOCAL=REPO/'.local/modstore-matrix'
LOCAL.mkdir(exist_ok=False)
(LOCAL/'private').mkdir();(LOCAL/'private/compose.env').write_text('CC_MODSTORE_PASSWORD='+secrets.token_hex(24)+'\n');(LOCAL/'private/compose.env').chmod(0o600)
cases=[]
services={'db':{'image':'mariadb:11.8','environment':{'MARIADB_ROOT_PASSWORD':'${CC_MODSTORE_PASSWORD:?}'},'volumes':['database:/var/lib/mysql'],'healthcheck':{'test':['CMD','healthcheck.sh','--connect','--innodb_initialized'],'interval':'2s','timeout':'5s','retries':40}}}
for i,(version,php) in enumerate((v,p) for v in ['2.8.4','2.8.8','3.1.2','3.2.4'] for p in ['8.1','8.2']):
 major=int(version[0]);name='m'+version.replace('.','')+'p'+php.replace('.','');port=24500+i
 f=LOCAL/name;(f/'private').mkdir(parents=True);(f/'evidence').mkdir()
 folder='modx2-compatibility' if major==2 else 'modx3-matrix'
 archive=REPO/f'.local/{folder}/download/modx-{version}-pl.zip'
 with zipfile.ZipFile(archive) as z:z.extractall(f/'unpack')
 extracted=next((f/'unpack').iterdir());shutil.move(str(extracted),str(f/'site'));(f/'unpack').rmdir()
 custom=php=='8.2'
 (f/'apache.conf').write_text('ServerName localhost\n'+('Alias /files/ /opt/cc-case/relocated-assets/\n<Directory /opt/cc-case/relocated-assets>\nRequire all granted\nAllowOverride All\n</Directory>\n' if custom else ''))
 services[name]={'image':('cookie-consent-modx3-php81:local' if php=='8.1' else 'cookie-consent-matrix-php82:local'),'ports':[f'127.0.0.1:{port}:80'],'depends_on':{'db':{'condition':'service_healthy'}},'volumes':[f'{f}/site:/var/www/html',f'{f}:/opt/cc-case',f'{REPO}:/opt/cc-repo:ro',f'{REPO}/.local/modstore{major}:/opt/cc-source:ro',f'{f}/apache.conf:/etc/apache2/conf-enabled/cc-modstore.conf:ro',f'{REPO}/tests/modx3/php82.ini:/usr/local/etc/php/conf.d/cc-modstore.ini:ro'],'environment':{'CC_MODSTORE_CASE':name,'CC_MODSTORE_MODX':version+'-pl','CC_MODSTORE_PORT':str(port),'CC_MODSTORE_CUSTOM':'1' if custom else '0','CC_MODSTORE_PASSWORD':'${CC_MODSTORE_PASSWORD:?}'}}
 cases.append(dict(name=name,major=major,modx=version+'-pl',php=php,port=port,custom=custom))
(LOCAL/'compose.json').write_text(json.dumps({'name':'cc-modstore-20261019','services':services,'volumes':{'database':{}},'networks':{'default':{'ipam':{'config':[{'subnet':'10.250.19.0/24'}]}}}},indent=2)+'\n')
(LOCAL/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
print('Prepared 8 new isolated cases')
