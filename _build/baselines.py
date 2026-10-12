#!/usr/bin/env python3
"""Export reviewed Git hashes, never installed site data. Run on the source checkout."""
from pathlib import Path
import subprocess,json,hashlib,re
root=Path(__file__).resolve().parents[1]
refs=['10acb4e62d2a6f59e058fe356feef23bf4497c27','7f9d11e359e4ccc0e647c88ff9706fedf80233e5']
files={};elements={'snippet':[],'chunk':[]}
for ref in refs:
 names=subprocess.check_output(['git','-C',str(root),'ls-tree','-r','--name-only',ref],text=True).splitlines()
 for name in names:
  if not (name.startswith(('server/','assets/')) or name=='CookiesPopup.html'):continue
  body=subprocess.check_output(['git','-C',str(root),'show',ref+':'+name])
  digest=hashlib.sha256(body).hexdigest();files.setdefault(name,[])
  if digest not in files[name]:files[name].append(digest)
  if name in ['server/modx2-registry-snippet.php','CookiesPopup.html']:
   key='snippet' if name.startswith('server/') else 'chunk'
   text=body.decode()
   if key=='snippet':text=re.sub(r'^<\?php\s*','',text).strip(' \n\r\0\v\t')
   # Match PHP default json_encode: ASCII + escaped slashes, compact separators.
   payload=json.dumps({'snippet':text},ensure_ascii=True,separators=(',',':')).replace('/','\\/')
   digest=hashlib.sha256(payload.encode()).hexdigest()
   if digest not in elements[key]:elements[key].append(digest)
(root/'_build/manual-baselines.json').write_text(json.dumps({'schema':1,'refs':refs,'files':files,'elements':elements},indent=2)+'\n')
print('Reviewed baseline hashes exported:',len(files),'source paths')
