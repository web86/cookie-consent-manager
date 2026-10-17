"""Bounded diagnostics: report existing CMS warnings, fail on any other diagnostic."""
import collections
import json
import re
import sys
from driver import compose
from prepare import LOCAL

phase=sys.argv[1] if len(sys.argv)>1 else 'final'
if phase not in ['pre-upgrade','final']:
    raise ValueError('Phase')
rows=[]
cases=json.loads((LOCAL/'cases.json').read_text())
if phase=='final' and (LOCAL/'final-cases.json').exists():cases+=json.loads((LOCAL/'final-cases.json').read_text())
for case in cases:
    fixture=LOCAL/case['name']
    raw=compose(case,'logs','--no-color',capture_output=True,text=True).stdout
    (fixture/f'evidence/docker-{phase}.log').write_text(raw)
    known=collections.Counter();harness=collections.Counter();unexpected=[];http=[]
    lines=(fixture/'site/core/cache/logs/error.log').read_text().splitlines()
    for line in lines:
        if 'setup/includes/modinstallsettings.class.php : 146)' in line and 'settings.cache.php' in line:
            known['official setup missing initial settings cache']+=1
        elif '.file.login.tpl.php :' in line and any(s in line for s in ['Undefined array key "modahsh"','Undefined array key "_post"','Attempt to read property "value" on null','Trying to access array offset on value of type null']):
            known['official Smarty login template undefined variables']+=1
        elif '.file.header.tpl.php :' in line and 'Undefined array key "a"' in line:
            known['official Smarty header undefined action']+=1
        elif 'core/model/modx/xmlrss/magpierss.class.php : 133)' in line and 'MagpieRSS::feed_start_element(): Argument #3 ($attrs) must be passed by reference' in line:
            known['official Manager RSS callback reference warning']+=1
        elif 'modManagerControllerDeprecated support is deprecated since version 2.2.0.' in line:
            harness['first attempt used MODX 3 language controller URL: deprecated fallback']+=1
        elif line.endswith('Could not find action file at: /var/www/html/manager/controllers/default/language'):
            harness['first attempt used MODX 3 language controller URL: missing controller']+=1
        else:
            unexpected.append(line[:300])
    php=collections.Counter()
    for line in raw.splitlines()+ (fixture/'evidence/setup.log').read_text().splitlines():
        match=re.search(r'PHP (Warning|Deprecated|Fatal error|Parse error): (.*)',line)
        if match:
            message=match[2]
            if match[1]=='Deprecated' and re.search(r'Creation of dynamic property (?:xPDOQuery_mysql::\$xpdo|modLexicon::\$config|modConnectorResponse::\$response|modInstallLexicon::\$config) is deprecated',message):
                php[message[:240]]+=1
            else:
                unexpected.append(match[0][:300])
        request=re.search(r'"(GET|POST|OPTIONS) (\S+) HTTP/[\d.]+" (\d{3}) ',line)
        if request and int(request[3])>=400:
            item=dict(method=request[1],path=request[2],status=int(request[3]))
            # ACL negatives and explicit private-directory guards are intentional.
            if int(request[3]) in [401,403] and (request[2].startswith('/assets/components/cookieconsent/connector.php') or request[2].startswith('/core/')):
                continue
            http.append(item)
    baseline=fixture/'evidence/core-before-component.log'
    def fingerprints(text):
        return sorted(set(re.sub(r'^\[[^]]+\] ', '',line) for line in text.splitlines()))
    # Fresh final fixtures establish a real official-Manager baseline before install.
    baseline_new=[]
    if case['name'].endswith('final'):
        baseline_new=sorted(set(fingerprints('\n'.join(lines)))-set(fingerprints(baseline.read_text())))
        for signature in baseline_new:
            if 'MagpieRSS::feed_start_element(): Argument #3 ($attrs) must be passed by reference' in signature:
                proof=json.loads((fixture/'evidence/upstream-rss.json').read_text())
                if proof['result']!='PASS' or proof['component_loaded']:unexpected.append(signature)
            else:unexpected.append(signature)
    row=dict(case=case['name'],known_official_core_warnings=dict(known),known_official_php_deprecations=dict(php),prior_harness_failures=dict(harness),asynchronous_original_cms_signatures_after_baseline=baseline_new,unexpected_php_or_modx=unexpected,unexpected_http=http)
    rows.append(row)
    if any(n!=1 for n in harness.values()):
        raise RuntimeError('Unexpected repeated harness failure')
(LOCAL/f'server-log-audit-{phase}.json').write_text(json.dumps(rows,indent=2)+'\n')
if any(r['unexpected_php_or_modx'] or r['unexpected_http'] for r in rows):
    raise RuntimeError('Inspect diagnostics; unexpected errors are not PASS')
print(json.dumps({'result':'PASS','scope':'no new component errors; original CMS warnings reported separately','cases':len(rows)}))
