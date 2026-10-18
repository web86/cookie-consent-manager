"""Compare the shipped native runtime with immutable pl6 and preflight with MODX 2."""
from pathlib import Path
import hashlib,json,os,re,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[2];LOCAL=ROOT/os.environ.get('CC_PREFLIGHT_LOCAL','.local/preflight3-pl7')
folder=ROOT/json.loads((LOCAL/'current-artifact.json').read_text())['folder']
old=ROOT/'.local/uninstall3/artifacts/final/release'
sig='cookieconsentmanager3-1.0.8-pl7';prior='cookieconsentmanager3-1.0.8-pl6'
a=json.loads((folder/(sig+'.inventory.json')).read_text());b=json.loads((old/(prior+'.inventory.json')).read_text())
current={x['target']:x['sha256'] for x in a['files']};previous={x['target']:x['sha256'] for x in b['files']}
assert current.keys()==previous.keys()
changes=[p for p in current if current[p]!=previous[p]]
assert sorted(changes)==['core/components/cookieconsentmanager3/frontend-manifest.json','core/components/cookieconsentmanager3/src/CookieConsentVersion.php'],changes
# Compare bytes from each actual native file vehicle, not just declared checksums.
def shipped(path):
 result={}
 with zipfile.ZipFile(path) as z:
  payloads={}
  for name in z.namelist():
   if '/xPDOFileVehicle/' not in name or not name.endswith('.vehicle'):continue
   text=z.read(name).decode()
   target=re.search(r"'relative_target' => '([^']+)'",text).group(1)
   source=re.search(r"'source' => '([^']+)'",text).group(1)
   base=re.search(r"'name' => '([^']+)'",text).group(1)
   payloads[target]=source+base
  for x in json.loads(path.with_name(path.name.replace('.transport.zip','.inventory.json')).read_text())['files']:
   data=z.read(payloads[x['target']]);assert hashlib.sha256(data).hexdigest()==x['sha256'];result[x['target']]=data
 return result
new_bytes=shipped(folder/(sig+'.transport.zip'));old_bytes=shipped(old/(prior+'.transport.zip'))
for p in current:
 if p not in changes:assert new_bytes[p]==old_bytes[p]
assert new_bytes[changes[0]].replace(b'1.0.8-pl7',b'1.0.8-pl6')==old_bytes[changes[0]]
assert new_bytes[changes[1]].replace(b'1.0.8-pl7',b'1.0.8-pl6')==old_bytes[changes[1]]
assert a['objects']==b['objects'],'Native object fields/policies unchanged'
ref=subprocess.check_output(['git','show','4ba4ef4:_build/preflight.php'],cwd=ROOT,text=True)
for cls in ['modNamespace','modChunk','modSnippet','modPlugin','modSystemSetting','modMenu']:
 ref=ref.replace("'"+cls+"'","'MODX\\Revolution\\"+cls+"'")
ref=ref.replace('xPDOTransport::','\\xPDO\\Transport\\xPDOTransport::').replace('xPDO::','\\xPDO\\xPDO::').replace('components/cookieconsentmanager/','components/cookieconsentmanager3/').replace("$core=$base.'cookieconsentmanager/';","$core=$base.'cookieconsentmanager3/';").replace("'2.8.4'","'3.1.2'").replace("'3.0.0'","'3.3.0'").replace('PHP 8.1+ and MODX 2.8.4+ (not MODX 3) required','PHP 8.1+ and MODX 3.1.2+ below 3.3 required')
assert ref==(ROOT/'_build/preflight.php').read_text(),'Preflight parity with native FQCN/path/version adaptations'
protected=['_build/ownership.php','_build/build.php','_build/verify-install.php','_build/validators/uninstall-file.php','_build/transport-files.json']
for p in protected:assert (ROOT/p).read_bytes()==subprocess.check_output(['git','show','99d7c32:'+p],cwd=ROOT),p
archive=folder/(sig+'.transport.zip');sha=hashlib.sha256(archive.read_bytes()).hexdigest()
assert archive.read_bytes()==(folder.parent/'repro'/archive.name).read_bytes()
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  data=z.read(name)
  assert b'components/cookieconsent3/' not in data and b'components/cookieconsent/' not in data,name
assert hashlib.sha256((old/(prior+'.transport.zip')).read_bytes()).hexdigest()=='5bb0477eda935a67f7cdc2415d7c4f8eb8a37ec424ef1e7484d5314982512f76'
result={'result':'PASS','signature':sig,'sha256':sha,'bytes':archive.stat().st_size,'runtime_files':len(current),'unchanged_runtime_files':len(current)-len(changes),'version_stamp_only_changes':changes,'native_object_definitions_unchanged':True,'preflight_modx2_reference':'4ba4ef44afe25eae6f6a16843e82161a1ab9d3be','preflight_parity':True,'protected_files_unchanged':protected,'reproducible':True,'prior_pl6_unchanged':True,'old_component_paths':False}
(folder/'parity-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
