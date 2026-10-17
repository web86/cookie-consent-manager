"""Read-only release metadata, reproducibility, runtime source and transport checks."""
from pathlib import Path
import hashlib, json, subprocess, sys
root=Path(__file__).resolve().parents[2]
a,b=map(Path,sys.argv[1:3]);source=sys.argv[3]
meta=json.loads((root/'_build/package.json').read_text());version=meta['version']+'-'+meta['release']+str(meta['release_index']);signature=meta['name']+'-'+version
n=0
def eq(x,y,message):
 global n;n+=1
 if x!=y:raise AssertionError(message)
eq(a.name,signature+'.transport.zip','Exact signature filename');eq(a.read_bytes(),b.read_bytes(),'Two native builds are byte-identical')
manifest=json.loads((root/'_build/frontend-manifest.json').read_text());eq(manifest['package_version'],version,'Adapter baseline manifest version')
for script in ['_build/version.mjs','_build/user-guide.mjs']:subprocess.run(['node',script,'--check'],cwd=root,check=True,stdout=subprocess.DEVNULL);n+=1
spec=json.loads(a.with_name(a.name.replace('.transport.zip','.inventory.json')).read_text());runtime=json.loads((root/'_build/transport-files.json').read_text());eq(spec['signature'],signature,'Native spec signature');eq(set(runtime),{r['target'] for r in spec['files']},'Exact runtime closure')
exceptions={'_build/frontend-manifest.json','server/src/CookieConsentVersion.php','server/src/CookieConsentBundleManager.php'}
for row in spec['files']:
 path=runtime[row['target']];eq(hashlib.sha256((root/path).read_bytes()).hexdigest(),row['sha256'],'Packaged exact source '+path)
 if path not in exceptions:eq((root/path).read_bytes(),subprocess.check_output(['git','show',source+':'+path],cwd=root),'UI/backend/adapter bytes unchanged '+path)
composition=json.loads(subprocess.check_output(['python3','tests/transport/composition.py',str(a)],cwd=root,text=True));eq(composition['result'],'PASS','Native transport vehicles/hooks/private originals/no runtime caches/prebuilt/fixtures')
print(json.dumps({'result':'PASS','signature':signature,'version':version,'size':a.stat().st_size,'sha256':hashlib.sha256(a.read_bytes()).hexdigest(),'reproducible':True,'assertions':n,'transport':composition,'source':source,'runtime_files':len(runtime)}))
