"""Byte-check original selected CMS APIs and ALL bundled xPDO files before upgrade."""
import hashlib
import json
import sys
from audit import LOCAL, selected

rows=[]
source=LOCAL/'download/modx-2.8.4-pl'
for case in json.loads((LOCAL/('final-cases.json' if '--final' in sys.argv else 'cases.json')).read_text()):
    fixture=LOCAL/case['name'];checked=0;changed=[]
    for file in source.rglob('*'):
        if not file.is_file():
            continue
        relative=file.relative_to(source)
        if selected(relative) or relative.as_posix().startswith('core/xpdo/'):
            installed=fixture/'site'/relative;checked+=1
            if not installed.is_file() or hashlib.sha256(installed.read_bytes()).digest()!=hashlib.sha256(file.read_bytes()).digest():
                changed.append(str(relative))
    if changed:
        raise RuntimeError('Original CMS files changed: '+str(changed))
    row=dict(case=case['name'],result='PASS',files=checked,changed=changed)
    rows.append(row);(fixture/'evidence/original-core-integrity.json').write_text(json.dumps(row,indent=2)+'\n')
print(json.dumps(rows,indent=2))
