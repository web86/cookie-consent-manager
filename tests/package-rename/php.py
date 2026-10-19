"""Run unchanged semantic suites on the two required PHP images; output stays isolated."""
from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/'.local/package-rename'
files=['tests/adapter-updates/php.php','tests/adapter-cache/php.php','tests/php.php','tests/viewer/php.php','tests/beta21/php.php','tests/beta24/php.php','tests/beta30/php.php','tests/beta31/php.php','tests/beta33/php.php','tests/manager-i18n-php.php','tests/manager-ux-php.php','tests/elements/php.php','tests/universal/php.php','tests/universal/audit-schema3.php','tests/beta1042/urls.php','tests/video-embeds/urls.php','tests/video-embeds/snippets.php','tests/banner-layout/php.php']
rows=[]
for php,image in [('8.1','cookie-consent-modx3-php81:local'),('8.2','cookie-consent-matrix-php82:local')]:
    out=LOCAL/('unit-php'+php.replace('.',''));out.mkdir(exist_ok=False);out.chmod(0o777)
    for file in files:
        r=subprocess.run(['docker','run','--rm','--network','none','-v',str(ROOT)+':/opt/cc-source:ro','-v',str(out)+':/opt/cc-source/.local','-w','/opt/cc-source',image,'runuser','-u','www-data','--','php',file],text=True,capture_output=True)
        (out/(file.replace('/','-')+'.log')).write_text(r.stdout+r.stderr)
        rows.append(dict(php=php,file=file,result='PASS' if r.returncode==0 else 'FAIL'))
        (LOCAL/'php-results.json').write_text(json.dumps(rows,indent=2)+'\n');print(rows[-1],flush=True)
if any(r['result']=='FAIL' for r in rows):raise SystemExit(1)
