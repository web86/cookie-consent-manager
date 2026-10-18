"""Keep raw diagnostics private. Whitelist exact upstream messages and deliberate negatives."""
import collections,json,re
from driver import compose
from prepare import LOCAL
rows=[]
for c in json.loads((LOCAL/'final-all-cases.json').read_text()):
    f=LOCAL/c['name'];raw=compose(c,'logs','--no-color',capture_output=True,text=True).stdout
    (f/'evidence/docker-final.log').write_text(raw)
    known=collections.Counter();expected=collections.Counter();unexpected=[];http=[]
    file=f/'site/core/cache/logs/error.log';lines=file.read_text().splitlines() if file.exists() else []
    for line in lines:
        if 'setup/includes/modinstallsettings.class.php : 146)' in line and 'settings.cache.php' in line:known['official setup initial settings cache']+=1
        elif '.file.login.tpl.php :' in line and any(s in line for s in ['Undefined array key "modahsh"','Undefined array key "_post"','Attempt to read property "value" on null','Trying to access array offset on value of type null']):known['official Smarty login variables']+=1
        elif '.file.header.tpl.php :' in line and 'Undefined array key "a"' in line:known['official Smarty header action']+=1
        elif 'core/model/modx/xmlrss/magpierss.class.php : 133)' in line and 'MagpieRSS::feed_start_element(): Argument #3 ($attrs) must be passed by reference' in line:known['official Manager RSS callback']+=1
        elif re.search(r'core/xpdo/cache/xpdocachemanager.class.php : (335|340)\) PHP warning: mkdir\(\): File exists$',line):
            proof=json.loads((f/'evidence/upstream-cache.json').read_text())
            if proof['result']=='PASS' and not proof['component_loaded']:known['reproduced upstream xPDO cache mkdir race']+=1
            else:unexpected.append(line[:400])
        elif 'Cookie Consent preflight refused: Unowned canonical element conflict: CookieConsent' in line:expected['intentional foreign-name refusal']+=1
        elif c['fresh'] and 'core/xpdo/transport/xpdoscriptvehicle.class.php : 67) xPDOScriptVehicle execution failed:' in line and line.endswith('/5a3a9db7dae67b8bd70c4409e2e8ef14.preflight.script)'):expected['intentional native preflight script abort']+=1
        elif c['fresh'] and 'core/xpdo/transport/xpdotransport.class.php : 271) Vehicle b1481e7fdc20f92db768992129ece8cd in transport cookieconsentmanager-1.0.8-pl4 failed to install and indicated the process should be aborted.' in line:expected['intentional native vehicle abort']+=1
        elif 'ERROR: xPDOScriptVehicle validation failed: type php' in line and c['fresh']:expected['intentional name-conflict script failure']+=1
        elif '[CookieConsent] Install build failed; inspect component build status. reason=js_parse' in line and c['fresh']:expected['intentional adapter parse failure']+=1
        elif 'Could not install package with signature:' in line and c['fresh']:expected['intentional name-conflict package refusal']+=1
        else:unexpected.append(line[:400])
    for line in raw.splitlines()+(f/'evidence/setup.log').read_text().splitlines():
        m=re.search(r'PHP (Warning|Deprecated|Fatal error|Parse error): (.*)',line)
        if m:
            if m[1]=='Deprecated' and re.search(r'Creation of dynamic property (?:xPDOQuery_mysql::\$xpdo|modLexicon::\$config|modConnectorResponse::\$response|modInstallLexicon::\$config) is deprecated',m[2]):known['official PHP 8.2 dynamic property']+=1
            else:unexpected.append(m[0][:400])
        request=re.search(r'"(GET|POST|OPTIONS) (\S+) HTTP/[\d.]+" (\d{3}) ',line)
        if request and int(request[3])>=400:
            if int(request[3]) in [401,403] and request[2].startswith('/assets/components/cookieconsentmanager/connector.php'):continue
            http.append(dict(method=request[1],path=request[2],status=int(request[3])))
    rows.append(dict(case=c['name'],known_upstream=dict(known),expected_negative=dict(expected),unexpected=unexpected,unexpected_http=http))
(LOCAL/'diagnostics.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps({'cases':len(rows),'unexpected':sum(len(r['unexpected'])+len(r['unexpected_http']) for r in rows)}))
if any(r['unexpected'] or r['unexpected_http'] for r in rows):raise SystemExit(1)
