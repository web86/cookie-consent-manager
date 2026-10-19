"""Export only sanitized fresh-install acceptance; historical migrations are out of scope."""
import hashlib,json,re,subprocess,zipfile
from prepare import ROOT,LOCAL
from driver import compose

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sig='cookieconsentmanager3-1.0.8-pl5';folder=LOCAL/'artifacts/release';archive=folder/(sig+'.transport.zip')
verification=json.loads((folder/'verification.json').read_text());assert verification['result']=='PASS' and verification['signature']==sig
assert sha(archive)==verification['sha256']==(folder/(archive.name+'.sha256')).read_text().split()[0]
assert archive.read_bytes()==(LOCAL/'artifacts/reproducible'/archive.name).read_bytes()
spec=json.loads((folder/(sig+'.inventory.json')).read_text());allow=json.loads((ROOT/'_build/transport-files.json').read_text())
assert spec['objects']['namespace']['fields']=={'name':'cookie_consent','path':'{core_path}components/cookieconsentmanager3/','assets_path':'{assets_path}components/cookieconsentmanager3/'}
for item in spec['files']:
 assert sha(ROOT/allow[item['target']])==item['sha256'],'Source changed after build: '+item['target']
 assert not item['target'].startswith('assets/components/cookieconsentmanager3/js/cookie-consent/services/')
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  b=z.read(name);assert b'components/cookieconsent/' not in b and b'components/cookieconsent3/' not in b and b'legacy_state' not in b,name
rows=[];physical=0
for c in json.loads((LOCAL/'cases.json').read_text()):
 f=LOCAL/c['name'];out=f/'evidence';report=json.loads((out/'browser.json').read_text());assert report['complete'] and report['tests']==14 and report['failed']==0
 attempt=json.loads((out/'browser-attempt-composer-prefix.json').read_text());assert attempt['results'][1]['name']=='native-fresh-install-aliases-off' and 'assert.ok' in attempt['results'][1]['error']
 # Failed test-format assertions occurred after the native PM install passed; no reset/replacement was used.
 identity=json.loads(compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','identity',capture_output=True,text=True).stdout)
 assert identity['aliases'] is False and identity['native'] is True;physical+=2
 assert all(n==1 for n in identity['counts'].values());physical+=len(identity['counts'])
 assert set(identity['categories'].values())=={'CookieConsentManager'};physical+=1
 assert list(identity['packages'])==[sig] and identity['packages'][sig]['installed'];physical+=1
 assert identity['namespace']['path']=='{core_path}components/cookieconsentmanager3/';physical+=1
 assert identity['namespace']['assets_path']=='{assets_path}components/cookieconsentmanager3/';physical+=1
 for item in spec['files']:assert sha(f/'site'/item['target'])==item['sha256'];physical+=1
 for kind in ['core','assets']:assert (f/'site'/kind/'components/cookieconsent/first-public-sentinel.txt').read_text()=='unrelated file';physical+=1
 versions=json.loads(compose(c,'exec','-T','web','php','/opt/cc-source/tests/public-install/fixture.php','component-versions',capture_output=True,text=True).stdout);assert versions=={'manifest':'1.0.8-pl5','adapters':'1.0.8-pl5'};physical+=1
 adapter=json.loads((out/'adapters.json').read_text());assert adapter['result']=='PASS'
 rows.append({'case':c['name'],'modx':c['modx'],'php':json.loads((out/'setup-info.json').read_text())['php'],'xpdo':identity['xpdo'],'deprecated_aliases':False,'fresh_install_proof':report['fresh_install_proof'],'tests':report['tests'],'assertions':report['assertions'],'failed':0,'results':report['results'],'adapters':adapter})
php=json.loads((LOCAL/'php-results.json').read_text());assert len(php)==38 and all(r['result']=='PASS' for r in php);php_assertions=0
for r in php:
 log=LOCAL/('unit-php'+r['php'].replace('.',''))/(r['file'].replace('/','-')+'.log');matches=re.findall(r'"assertions"\s*:\s*(\d+)',log.read_text());assert matches,r['file'];php_assertions+=int(matches[-1])
requirements=json.loads((LOCAL/'requirements.json').read_text());assert len(requirements)==4 and all(r['result']=='PASS' for r in requirements)
syntax=json.loads((LOCAL/'syntax.json').read_text());assert syntax['result']=='PASS'
contracts=json.loads((LOCAL/'contracts.json').read_text());assert contracts['result']=='PASS'
diagnostics=json.loads((LOCAL/'diagnostics.json').read_text());assert len(diagnostics)==4 and all(not r['unexpected'] for r in diagnostics)
js=[]
for name in ['video-php','placeholder-php']:
 log=LOCAL/(name+'.log');text=log.read_text();count=sum(l.startswith('PASS ') for l in text.splitlines());assert count and 'AssertionError' not in text and 'FAIL ' not in text
 js.append({'suite':name,'result':'PASS','pass_lines':count,'log_sha256':sha(log)})
result={'schema':1,'scope':'First public release, new native installations only; user explicitly accepted native scope excluding historical Fenom/live-playback gates','branch':'codex/modx3-cookieconsentmanager','base':'ef96e4f2e4d39ffebae5e63d2bbfbc9cfe48af32','signature':sig,'sha256':sha(archive),'bytes':archive.stat().st_size,'native_archive':verification,'reproducible':True,'fresh_install_decision':'GO','modstore_decision':'GO','tests':sum(r['tests'] for r in rows)+len(rows),'assertions':sum(r['assertions']+r['adapters']['assertions'] for r in rows),'failed':0,'physical_checks':physical,'cases':rows,'php':{'suites':len(php),'assertions':php_assertions,'failed':0,'results':php},'requirements':requirements,'contracts':contracts,'syntax':syntax,'diagnostics':diagnostics,'js_regressions':js,'namespace':'cookie_consent','component':'cookieconsentmanager3','old_paths_in_zip':False,'migration':False,'runtime_alias_layer':False,'preserved':['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo','CookiesPopup','cookie_consent.*','window.web86CookieConsent','onAllowed()','mountEmbeds()','public adapter paths','JSONL format','administrative PHP build and fallback'],'compatibility':{'modx':'>=3.1.2,<3.3.0','php':'>=8.1.0'},'reused_compatibility_evidence':'docs/evidence/modx3-version-compatibility-final.json','out_of_scope':['Historical cookieconsent/cookieconsent3 migration','Full third-party extra transport coexistence test','Fenom/pdoTools3 3.1.0 warm compiled-cache acceptance','Real vendor video playback and analytics-account delivery'],'limitations':['Existing pdoTools3 3.1.0 Fenom warm-cache issue is unchanged; this configuration is not certified.','External SDK/iframe network intercepted in automated tests.','Original harness attempts preserved; empty JSON representation and Composer v-prefix expectations corrected without a product-code change or database reset.'],'main_unchanged':True,'modx3_unchanged':True,'published':False,'deployed':False}
(ROOT/'docs/evidence/modx3-first-public-release.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['signature','sha256','tests','assertions','failed','physical_checks','modstore_decision']}));print('PHP suites',len(php),'assertions',php_assertions)
