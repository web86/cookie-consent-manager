#!/usr/bin/env python3
"""Aggregate sanitized evidence; fail closed on missing/failed mandatory checks."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2]
out=root/'.local/beta102/evidence'
def read(name):return json.loads((out/name).read_text())
def sha(value):return hashlib.sha256(value).hexdigest()
rows=[]
for name,file,count in [('Combined Fenom source','source-fenom.json',31),('Combined visibility source','source-visibility.json',20),('Native ZIP install/upgrade/reinstall/browser','native.json',24)]:
 r=read(file);assert r['failed']==0 and r['tests']==count,(name,r.get('failed'));rows.append({'name':name,'result':'PASS','tests':r['tests'],'assertions':r['assertions']})
r=read('regression.json');assert r['failed']==0 and len(r['results'])==16,r
rows.extend(r['results'])
pkg=read('package.json');assert pkg['failed']==0
rows.append({'name':'Native Package Manager beta metadata UI','result':'PASS','tests':1,'assertions':pkg['assertions']})
for name,file in [('PHP 8.1','php81.json'),('PHP 8.2 and syntax','php82-and-syntax.json')]:
 r=read(file);assert r['failed']==0,r
 suites=[x for x in r['results'] if x.get('suite',x.get('name','')).endswith('.php')]
 rows.append({'name':name,'result':'PASS','phpSuites':len(suites),'assertions':sum(json.loads(x['output'])['assertions'] for x in suites),**({'phpLinted':r['php_linted'],'jsChecked':r['js_checked']} if 'php_linted' in r else {})})
build=read('build.json');assert build['archivesIdentical'] and build['inventoryIdentical']
spec=json.loads((root/'.local/beta102/build-a/cookieconsent-1.0.2-beta1.inventory.json').read_text())
expected={f['target']:f['sha256'] for f in spec['files']}
for filename in ['installed-php82.json','installed-php81.json','installed-main-final.json']:
 data=read(filename);assert data['files']==expected,filename
 for name,key in {'CookiesPopup':'chunk','CookieConsent':'CookieConsent','CookieConsentMap':'CookieConsentMap','CookieConsentAssets':'CookieConsentAssets','CookieConsentBanner':'CookieConsentBanner'}.items():
  assert data['elements'][name]['count']==1
  assert data['elements'][name]['source']==sha(spec['objects'][key]['fields']['snippet'].encode()),(filename,name)
rows.append({'name':'Final installed file/canonical hashes on PHP 8.1, 8.2 and main','result':'PASS','runtimeFilesPerInstance':len(expected),'canonicalElementsPerInstance':5})
report={'signature':spec['signature'],'recommendation':'GO for manual staging acceptance only','result':'PASS','build':build,'checks':rows,'notRun':['Customer production or affected-site staging/Safari acceptance: no access provided','Live vendor delivery / published GTM container execution: no real analytics events authorized','Full cross-webserver/TLS/CDN/CSP matrix for this beta'],'originalPullRequests':'#4 and #6 remain open/unmerged; integration is Draft PR #7'}
(out/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'result':report['result'],'recommendation':report['recommendation'],'checks':len(rows),'sha256':build['sha256']}))
