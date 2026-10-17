"""Audit official archives without installing intermediate MODX releases."""
from pathlib import Path
import difflib
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / '.local/modx2-compatibility'
VERSIONS = ['2.8.4', '2.8.5', '2.8.6', '2.8.7', '2.8.8']
MODELS = ['modx', 'modrequest', 'modresponse', 'modprocessor', 'modmanagercontroller', 'modnamespace',
          'modsystemsetting', 'modelement', 'modscript', 'modsnippet', 'modchunk',
          'modresource', 'modtemplate', 'modplugin', 'modpluginevent', 'modlexicon',
          'moduser', 'modcontext', 'modconnectorresponse', 'modprocessorresponse',
          'modcategory', 'modmenu', 'modaccesspermission', 'modaccesspolicytemplate',
          'modaccesspolicy', 'modaccessibleobject', 'modaccessiblesimpleobject']

def selected(path):
    name = path.name
    relative = path.as_posix()
    return (relative.startswith('core/xpdo/') or
            relative.startswith('core/model/modx/transport/') or
            relative.startswith('core/model/modx/registry/') or
            relative.startswith('core/model/modx/mysql/') and name.removesuffix('.map.inc.php') in MODELS or
            relative.startswith('core/model/modx/') and name.removesuffix('.class.php') in MODELS or
            relative.startswith('core/model/modx/') and name == 'modcachemanager.class.php' or
            relative.startswith('core/model/modx/processors/workspace/packages/') or
            relative in ['core/model/modx/processors/security/login.class.php',
                         'core/model/modx/processors/system/clearcache.class.php'])

def audit():
    archives, trees = [], []
    for version in VERSIONS:
        archive = LOCAL / f'download/modx-{version}-pl.zip'
        source = archive.parent / f'modx-{version}-pl'
        with zipfile.ZipFile(archive) as z:
            for name in z.namelist():
                if not (archive.parent / name).resolve().is_relative_to(archive.parent.resolve()):
                    raise RuntimeError('Archive traversal')
            if not source.exists():
                z.extractall(archive.parent)
        xpdo = (source/'core/xpdo/xpdo.class.php').read_text()
        xpdo_version = re.search(r'xPDO ([0-9.]+-pl)', (source/'core/xpdo/changelog.txt').read_text()).group(1)
        tree = {str(p.relative_to(source)): p.read_text(errors='replace')
                for p in source.rglob('*.php') if selected(p.relative_to(source))}
        trees.append(tree)
        archives.append(dict(modx=version+'-pl', xpdo=xpdo_version,
                             selected_files=len(tree), sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                             url=f'https://modx.s3.amazonaws.com/releases/{version}/modx-{version}-pl.zip'))
    changes = []
    for i in range(1, len(trees)):
        changed = []
        for path in sorted(set(trees[i-1]) | set(trees[i])):
            before, after = trees[i-1].get(path, ''), trees[i].get(path, '')
            if before != after:
                changed.append(path)
                diff = ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
                                                  fromfile=VERSIONS[i-1]+'/'+path, tofile=VERSIONS[i]+'/'+path))
                dest=LOCAL/'api-diffs'/f'{VERSIONS[i-1]}-{VERSIONS[i]}'/(path+'.diff')
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(diff)
        changes.append(dict(before=VERSIONS[i-1], after=VERSIONS[i], changed=changed))
    result=dict(archives=archives, changes=changes)
    (LOCAL/'api-audit.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    audit()
