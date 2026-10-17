"""Compare relevant API implementations before installing any CMS fixture."""
import difflib
import hashlib
import json
from prepare import LOCAL, archives

archives()
directories=sorted((LOCAL/'download').glob('modx-*-pl'))
paths=[
    'core/src/Revolution/Transport/modTransportPackage.php',
    'core/src/Revolution/Transport/modPackageBuilder.php',
    'core/src/Revolution/modNamespace.php',
    'core/src/Revolution/Registry/Db/modDbRegisterQueue.php',
    'core/src/Revolution/Processors/Processor.php',
    'core/src/Revolution/Processors/Workspace/Packages/Install.php',
    'core/src/Revolution/Processors/Workspace/Packages/ScanLocal.php',
]+['core/vendor/xpdo/xpdo/src/xPDO/Transport/'+name+'.php' for name in
   ['xPDOTransport','xPDOFileVehicle','xPDOObjectVehicle','xPDOScriptVehicle']]
hashes={}
diffs=[]
for path in paths:
    contents={d.name:(d/path).read_text() for d in directories}
    hashes[path]={v:hashlib.sha256(s.encode()).hexdigest() for v,s in contents.items()}
    for a,b in zip(directories,directories[1:]):
        diffs.extend(difflib.unified_diff(contents[a.name].splitlines(True),contents[b.name].splitlines(True),fromfile=a.name+'/'+path,tofile=b.name+'/'+path))
(LOCAL/'api-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
(LOCAL/'api-diff.txt').write_text(''.join(diffs))
print('API hashes and adjacent-version diffs saved')
