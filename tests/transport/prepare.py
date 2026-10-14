#!/usr/bin/env python3
# coding: utf-8
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2]
source=root/'.local/modx3/download/modx-3.2.4-pl'
if not source.is_dir():raise RuntimeError('Run tests/local/prepare.py to download official MODX first')
for name in ['clean','publiccore']:
    folder=root/('.local/modx3/transport-'+name)
    folder.joinpath('private').mkdir(parents=True,exist_ok=True)
    if not folder.joinpath('public/index.php').exists():shutil.copytree(source,folder/'public',dirs_exist_ok=True)
root.joinpath('.local/modx3/artifacts').mkdir(exist_ok=True)
print('Disposable transport fixtures prepared')
