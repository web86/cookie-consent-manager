"""Prepare new MODX 3 fixtures only. Never reset an existing DB or overwrite a site."""
from pathlib import Path
import hashlib, secrets, shutil, subprocess, zipfile
root = Path(__file__).resolve().parents[2]
local = root / '.local/modx3'
archive = local / 'download/modx-3.2.4-pl.zip'
archive.parent.mkdir(parents=True, exist_ok=True)
if not archive.exists():
    subprocess.run(['curl', '-fL', 'https://modx.s3.amazonaws.com/releases/3.2.4/modx-3.2.4-pl.zip', '-o', str(archive)], check=True)
with zipfile.ZipFile(archive) as z:
    for name in z.namelist():
        if not (archive.parent / name).resolve().is_relative_to(archive.parent.resolve()):
            raise RuntimeError('Archive traversal')
    source = archive.parent / 'modx-3.2.4-pl'
    if not source.exists(): z.extractall(archive.parent)
for fixture in [local, local / 'clean', local / 'fresh']:
    (fixture / 'private').mkdir(parents=True, exist_ok=True)
    if not (fixture / 'site').exists(): shutil.copytree(source, fixture / 'site')
    (fixture / 'private/disposable-marker').write_text('cookie-consent-modx3-acceptance\n')
env = local / 'private/compose.env'
if not env.exists():
    env.write_text('CC_DB_PASSWORD=' + secrets.token_hex(24) + '\n')
    env.chmod(0o600)
(local / 'artifacts').mkdir(exist_ok=True)
(local / 'evidence').mkdir(exist_ok=True)
print('MODX 3.2.4 official archive SHA256:', hashlib.sha256(archive.read_bytes()).hexdigest())
