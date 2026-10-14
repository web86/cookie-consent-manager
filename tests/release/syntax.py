from pathlib import Path
import subprocess,json
root=Path('.');php=sorted([str(p)for folder in ['server','_build','tests']for p in (root/folder).rglob('*.php')]);js=sorted([str(p)for folder in ['assets','_build','examples','tests']for p in (root/folder).rglob('*.js')]+[str(p)for folder in ['_build','tests']for p in(root/folder).rglob('*.mjs')]);failed=[]
for p in php:
 r=subprocess.run(['docker','compose','--env-file','.local/private/compose.env','-f','tests/local/compose.yaml','exec','-T','web','php','-l','/opt/cc-source/'+p],text=True,capture_output=True)
 if r.returncode:failed.append({'path':p,'error':r.stdout+r.stderr})
for p in js:
 r=subprocess.run(['node','--check',p],text=True,capture_output=True)
 if r.returncode:failed.append({'path':p,'error':r.stderr})
meta=json.loads(Path('_build/package.json').read_text());signature=meta['name']+'-'+meta['version']+('-'+meta['release']+str(meta['release_index']) if meta['release'] else '')
r={'signature':signature,'tests':1,'assertions':len(php)+len(js),'php_files':len(php),'js_files':len(js),'failed':len(failed),'result':'FAIL'if failed else'PASS','errors':failed};Path('.local/release100-evidence/syntax.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));raise SystemExit(bool(failed))
