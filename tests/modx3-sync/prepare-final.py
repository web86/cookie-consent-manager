"""Fresh final-artifact fixtures; never overwrite earlier candidate installations."""
from pathlib import Path
import shutil,subprocess
root=Path(__file__).resolve().parents[2];compose=root/'tests/modx3/compose.yaml';s=compose.read_text()
fixtures=[('finalclean',20893),('finalfresh',20894),('finalpristine',20895)]
for name,port in fixtures:
 fixture=root/'.local/modx3'/name
 if fixture.exists():raise RuntimeError('Final fixture already exists; preserve it')
 (fixture/'private').mkdir(parents=True);(fixture/'private/disposable-marker').write_text('cookie-consent-modx3-acceptance\n')
 shutil.copytree(root/'.local/modx3/download/modx-3.2.4-pl',fixture/'site')
 block=f'''  {name}:
    image: cookie-consent-modx3-php81:local
    ports: ['127.0.0.1:{port}:80']
    depends_on:
      db: {{condition: service_healthy}}
    volumes:
      - ../../.local/modx3/{name}/site:/var/www/html
      - ../../.local/modx3/{name}/private:/opt/cc-private
      - ../../:/opt/cc-source:ro
      - ../../.local/modx3/artifacts:/opt/cc-artifacts
    environment:
      CC_MODX3_DISPOSABLE: cookie-consent-modx3-acceptance
      CC_DB_NAME: cookie_consent_modx3_{name}
      CC_HTTP_PORT: '{port}'
      CC_DB_PASSWORD: ${{CC_DB_PASSWORD:?}}
'''
 if '  '+name+':' not in s:
  i=s.index('  php82:');s=s[:i]+block+s[i:]
compose.write_text(s)
for path in ['tests/modx3/guard.php','tests/modx3/install.php']:
 p=root/path;s=p.read_text()
 if "'cookie_consent_modx3_finalclean'" not in s:s=s.replace("'cookie_consent_modx3_pristine'", "'cookie_consent_modx3_pristine',"+','.join("'cookie_consent_modx3_"+name+"'" for name,_ in fixtures));p.write_text(s)
p=root/'tests/modx3/helpers.mjs';s=p.read_text()
if 'finalclean:20893' not in s:p.write_text(s.replace('pristine:20892','pristine:20892,finalclean:20893,finalfresh:20894,finalpristine:20895'))
cmd=['docker','compose','--env-file','.local/modx3/private/compose.env','-f','tests/modx3/compose.yaml']
subprocess.run(cmd+['up','-d']+[name for name,_ in fixtures],cwd=root,check=True)
for name,_ in fixtures:
 subprocess.run(cmd+['exec','-T',name,'php','/opt/cc-source/tests/modx3/install.php'],cwd=root,check=True)
 subprocess.run(cmd+['exec','-T','-w','/var/www/html/setup',name,'php','index.php','--installmode=new','--config=/opt/cc-private/setup.xml'],cwd=root,check=True)
 subprocess.run(cmd+['exec','-T',name,'php','/opt/cc-source/tests/modx3/finish.php'],cwd=root,check=True)
