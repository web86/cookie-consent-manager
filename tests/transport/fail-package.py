#!/usr/bin/env python3
"""Generate a deliberately corrupt beta98 native payload to exercise resolver rollback."""
from pathlib import Path
import zipfile,sys,json
src=Path('.local/artifacts/cookieconsent-0.1.0-beta2.transport.zip');out=src.with_name('cookieconsent-0.1.0-beta98.transport.zip')
with zipfile.ZipFile(src) as z:
 entries={n.replace('cookieconsent-0.1.0-beta2','cookieconsent-0.1.0-beta98'):z.read(n).replace(b'cookieconsent-0.1.0-beta2',b'cookieconsent-0.1.0-beta98').replace(b'0.1.0-beta2',b'0.1.0-beta98') for n in z.namelist()}
 # Last alphabetical runtime file: error after many previous files have been activated.
 target=next(n for n in entries if n.endswith('/payload/core/components/cookieconsent/templates/home.tpl'))
 entries[target]+=b'<!-- Intentionally corrupt acceptance fixture -->'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in sorted(entries.items()):z.writestr(n,b)
print('Corrupt beta98 created; test fixture only, never distribute')
# A failure in an intermediate native object vehicle, before final activation.
out=src.with_name('cookieconsent-0.1.0-beta97.transport.zip')
with zipfile.ZipFile(src) as z:
 entries={n.replace('cookieconsent-0.1.0-beta2','cookieconsent-0.1.0-beta97'):z.read(n).replace(b'cookieconsent-0.1.0-beta2',b'cookieconsent-0.1.0-beta97').replace(b'0.1.0-beta2',b'0.1.0-beta97') for n in z.namelist()}
 target=next(n for n,b in entries.items() if n.endswith('.vehicle') and b'cookie_consent.texts' in b and b"'class' => 'modSystemSetting'" in b)
 entries[target]=entries[target].replace(b"'class' => 'modSystemSetting'",b"'class' => 'MissingAcceptanceObject'")
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in sorted(entries.items()):z.writestr(n,b)
print('Intermediate-vehicle beta97 created; test fixture only')
