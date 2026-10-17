"""Bounded server-log audit. Preserve raw Docker logs only in ignored fixtures."""
import json
import re
from driver import compose
from prepare import LOCAL

rows=[]
for case in json.loads((LOCAL/'cases.json').read_text()):
    fixture=LOCAL/case['name']
    preserved=fixture/'evidence/docker-preserved.log'
    if preserved.exists(): raw=preserved.read_text()
    else:
        raw=compose(case,'logs','--no-color',capture_output=True,text=True).stdout
        (fixture/'evidence/docker-log-audit.log').write_text(raw)
    setup503=0
    unexpected=[]
    for line in raw.splitlines():
        match=re.search(r'"(GET|POST|OPTIONS) (\S+) HTTP/[\d.]+" (\d{3}) ',line)
        if not match or int(match[3])<500: continue
        if match[3]=='503' and match[2]=='/assets/components/cookieconsent/audit.php': setup503+=1
        else: unexpected.append(dict(method=match[1],path=match[2],status=int(match[3])))
    php=sorted(set(re.sub(r'.*PHP (Warning|Deprecated|Fatal error|Parse error): ',r'\1: ',s)[:240]
                   for s in raw.splitlines() if re.search(r'PHP (Warning|Deprecated|Fatal error|Parse error):',s)))
    rows.append(dict(case=case['name'],pre_setup_audit503=setup503,unexpected_5xx=unexpected,php_diagnostics=php))
(LOCAL/'server-log-audit.json').write_text(json.dumps(rows,indent=2)+'\n')
if any(r['unexpected_5xx'] or r['php_diagnostics'] or r['pre_setup_audit503']>1 for r in rows):
    raise RuntimeError('Inspect server-log-audit.json; unexpected error')
print(json.dumps({'cases':len(rows),'unexpected_5xx':0,'php_diagnostics':0,
                  'pre_setup_audit503':sum(r['pre_setup_audit503'] for r in rows)}))
