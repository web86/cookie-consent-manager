#!/usr/bin/env python3
# coding: utf-8
"""Normalize metadata of an ALREADY native-built transport; never invent vehicles."""
from pathlib import Path
import sys, json, hashlib, zipfile, datetime
archive=Path(sys.argv[1]);inventory=Path(str(archive).replace('.transport.zip','.inventory.json'))
spec=json.loads(inventory.read_text());stamp=datetime.datetime.utcfromtimestamp(spec['source_epoch']);dt=(stamp.year,stamp.month,stamp.day,stamp.hour,stamp.minute,stamp.second//2*2)
with zipfile.ZipFile(archive) as z:
    entries={i.filename:z.read(i) for i in z.infolist() if not i.is_dir()}
    if len(entries)!=len([i for i in z.infolist() if not i.is_dir()]):raise RuntimeError('Duplicate ZIP names')
    for name in entries:
        if name.startswith('/') or '..' in Path(name).parts:raise RuntimeError('ZIP traversal')
    if spec['signature']+'/manifest.php' not in entries:raise RuntimeError('Native manifest missing')
    if not any(n.endswith('.vehicle') for n in entries):raise RuntimeError('Native vehicles missing')
normalized=archive.with_suffix('.normalized')
with zipfile.ZipFile(normalized,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name in sorted(entries):
        info=zipfile.ZipInfo(name,dt);info.create_system=3;info.external_attr=(0o100644<<16);info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,entries[name],compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
normalized.replace(archive)
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
Path(str(archive)+'.sha256').write_text(sha+'  '+archive.name+'\n')
file_hashes={name:hashlib.sha256(body).hexdigest() for name,body in sorted(entries.items())}
Path(str(archive).replace('.transport.zip','.zip-inventory.json')).write_text(json.dumps({'signature':spec['signature'],'sha256':sha,'files':file_hashes},indent=2)+'\n')
print(json.dumps({'signature':spec['signature'],'sha256':sha,'entries':len(entries)}))
