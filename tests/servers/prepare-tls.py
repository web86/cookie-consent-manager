#!/usr/bin/env python3
"""Create isolated acceptance certificates. No production certificate/configuration is read."""
from pathlib import Path
import subprocess
p=Path('.local/server-tls');p.mkdir(parents=True,exist_ok=True)
def run(*args):subprocess.run(['openssl',*args],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
if not (p/'site.pem').exists():
 run('req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(p/'ca.key'),'-out',str(p/'ca.pem'),'-days','30','-subj','/CN=CC local acceptance CA','-addext','basicConstraints=critical,CA:TRUE')
 run('req','-newkey','rsa:2048','-nodes','-keyout',str(p/'site.key'),'-out',str(p/'site.csr'),'-subj','/CN=cc-tls.test')
 (p/'extensions').write_text('subjectAltName=DNS:cc-tls.test\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n')
 run('x509','-req','-in',str(p/'site.csr'),'-CA',str(p/'ca.pem'),'-CAkey',str(p/'ca.key'),'-CAcreateserial','-out',str(p/'site.pem'),'-days','30','-extfile',str(p/'extensions'))
 run('req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(p/'untrusted.key'),'-out',str(p/'untrusted.pem'),'-days','30','-subj','/CN=cc-untrusted.test','-addext','subjectAltName=DNS:cc-untrusted.test')
 (p/'ca-bundle.pem').write_bytes((p/'ca.pem').read_bytes())
 for path in p.glob('*.key'):path.chmod(0o600)
print('Local TLS fixture ready')
