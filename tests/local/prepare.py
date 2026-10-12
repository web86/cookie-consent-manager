#!/usr/bin/env python3
"""Download official MODX into an isolated ignored fixture. No production inputs."""
from pathlib import Path
import hashlib
import secrets
import subprocess
import zipfile
import shutil
import os

root = Path(__file__).resolve().parents[2]
local = root / '.local'
private = local / 'private'
private.mkdir(parents=True, exist_ok=True)
archive = local / 'download' / 'modx-2.8.8-pl.zip'
archive.parent.mkdir(parents=True, exist_ok=True)
if not archive.exists():
    subprocess.run(['curl', '-fL', 'https://modx.s3.amazonaws.com/releases/2.8.8/modx-2.8.8-pl.zip', '-o', str(archive)], check=True)
print('MODX archive SHA256:', hashlib.sha256(archive.read_bytes()).hexdigest())
site = local / 'site'
if not (site / 'index.php').exists():
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            target = (archive.parent / name).resolve()
            if not target.is_relative_to(archive.parent.resolve()):
                raise RuntimeError('Archive traversal rejected')
        z.extractall(archive.parent)
    shutil.copytree(archive.parent / 'modx-2.8.8-pl', site, dirs_exist_ok=True)
compose = private / 'compose.env'
if not compose.exists():
    compose.write_text('CC_DB_PASSWORD=' + secrets.token_hex(24) + '\n')
    compose.chmod(0o600)
config = private / 'config.php'
if not config.exists():
    config.write_text("<?php return ['site_origin'=>'http://127.0.0.1:8888','rate_limit_key'=>'" + secrets.token_hex(32) + "','rate_limit_per_minute'=>10000];\n")
# Disposable stress fixture uses 10000/min; product default remains 60/min.
print('Fixture prepared at', local)
