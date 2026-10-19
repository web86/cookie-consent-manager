"""Prepare a test-only next version from current source; refuse overwriting previous evidence."""
from pathlib import Path
import json,shutil,subprocess
ROOT=Path(__file__).resolve().parents[2];dst=ROOT/'.local/package-rename/upgrade-source-final'
if dst.exists():raise RuntimeError('Existing test candidate preserved')
dst.mkdir()
for d in ['server','assets','_build']:shutil.copytree(ROOT/d,dst/d)
for f in ['CookiesPopup.html','package-lock.json']:shutil.copyfile(ROOT/f,dst/f)
p=dst/'_build/package.json';m=json.loads(p.read_text());m.update(version='1.0.9',release_index=1);p.write_text(json.dumps(m,indent=2)+'\n')
subprocess.run(['node','_build/version.mjs'],cwd=dst,check=True)
subprocess.run(['node','_build/frontend.mjs'],cwd=dst,check=True)
