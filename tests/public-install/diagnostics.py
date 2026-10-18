"""Preserve raw local logs; fail on new PHP diagnostics and unexpected HTTP 5xx."""
import json,re,collections
from driver import compose
from prepare import ROOT,LOCAL
rows=[]
for c in json.loads((LOCAL/'cases.json').read_text()):
 f=LOCAL/c['name'];raw=compose(c,'logs','--no-color',capture_output=True,text=True).stdout
 (f/'evidence/docker-diagnostics.log').write_text(raw)
 unexpected=[];pre_setup=0
 for line in raw.splitlines():
  m=re.search(r'"(GET|POST|OPTIONS) (\S+) HTTP/[\d.]+" (\d{3}) ',line)
  if m and int(m[3])>=500:
   if m[3]=='503' and m[2]=='/assets/components/cookieconsentmanager3/audit.php':pre_setup+=1
   else:unexpected.append({'method':m[1],'path':m[2],'status':int(m[3])})
  if re.search(r'PHP (Warning|Deprecated|Fatal error|Parse error):',line):unexpected.append(line[:400])
 log=f/'site/core/cache/logs/error.log';expected=collections.Counter()
 for line in log.read_text().splitlines() if log.exists() else []:
  if re.search(r'manager/controllers/default/security/login.class.php : (191|212)\) PHP warning: Undefined array key \"HTTP_ACCEPT_LANGUAGE\"$',line):
   original=ROOT/'.local/modx3-matrix/download'/('modx-'+c['modx'])/'manager/controllers/default/security/login.class.php'
   assert original.read_bytes()==(f/'site/manager/controllers/default/security/login.class.php').read_bytes()
   expected['unmodified MODX login missing Accept-Language in auxiliary harness']+=1
  elif '[CookieConsent] Install build failed; inspect component build status. reason=js_parse' in line:expected['intentional invalid adapter with working fallback']+=1
  else:unexpected.append(line[:400])
 if pre_setup!=1:unexpected.append({'expected_pre_setup_503':1,'actual':pre_setup})
 rows.append({'case':c['name'],'pre_setup_503':pre_setup,'expected':dict(expected),'unexpected':unexpected})
(LOCAL/'diagnostics.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'cases':len(rows),'unexpected':sum(len(r['unexpected']) for r in rows)}))
if any(r['unexpected'] for r in rows):raise SystemExit(1)
