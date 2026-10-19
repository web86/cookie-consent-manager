"""Only operate case-specific projects with a marker; never reset or drop databases."""
import json, subprocess, sys, os
from prepare import ROOT,LOCAL

def compose(case,*args,**kwargs):
    fixture=LOCAL/case['name']
    if (fixture/'private/disposable-marker').read_text().strip()!=case['name']:raise RuntimeError('Marker')
    return subprocess.run(['docker','compose','--env-file',str(fixture/'private/compose.env'),'-f',str(fixture/'compose.yaml'),*args],cwd=ROOT,check=True,**kwargs)

if __name__=='__main__':
    if sys.argv[1]=='setup-parallel':
        from concurrent.futures import ThreadPoolExecutor
        cases=json.loads((LOCAL/('final-all-cases.json' if os.environ.get('CC_RENAME_FINAL') else 'all-cases.json')).read_text())
        def setup_one(case):
            subprocess.run([sys.executable,__file__,'setup',case['name']],check=True)
        with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(setup_one,cases))
        sys.exit(0)
    for c in json.loads((LOCAL/('final-all-cases.json' if os.environ.get('CC_RENAME_FINAL') else 'all-cases.json')).read_text()):
        if len(sys.argv)>2 and c['name'] not in sys.argv[2:]:continue
        if sys.argv[1]=='setup':
            f=LOCAL/c['name'];print('Setup '+c['name'],flush=True)
            if (f/'evidence/setup-info.json').exists():raise RuntimeError('Already installed')
            with (f/'evidence/setup.log').open('a') as log:
                compose(c,'up','-d',stdout=log,stderr=log)
                action='verify-prepared' if (f/'private/setup.xml').exists() else 'prepare'
                compose(c,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php',action,stdout=log,stderr=log)
                compose(c,'exec','-T','-w','/var/www/html/setup','web','php','index.php','--installmode=new','--config=/opt/cc-private/setup.xml',stdout=log,stderr=log)
                info=compose(c,'exec','-T','web','php','/opt/cc-source/tests/package-rename/fixture.php','finish',capture_output=True,text=True)
                json.loads(info.stdout);(f/'evidence/setup-info.json').write_text(info.stdout+'\n')
        elif sys.argv[1]=='stop':compose(c,'stop')
        else:raise ValueError(sys.argv[1])
