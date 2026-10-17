"""Run independent cases with two workers; do not rerun or reset accepted sites."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
from driver import compose, setup
from prepare import ROOT, LOCAL

def run(case):
    fixture=LOCAL/case['name']
    if (fixture/'evidence/browser.json').exists(): raise RuntimeError('Existing browser evidence: '+case['name'])
    try:
        if not (fixture/'evidence/setup-info.json').exists(): setup(case)
        else: compose(case,'up','-d',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        with (fixture/'evidence/browser.log').open('w') as log:
            result=subprocess.run(['node','tests/modx3-matrix/browser.mjs',case['name']],cwd=ROOT,stdout=log,stderr=log)
        print(case['name'], 'PASS' if result.returncode==0 else 'FAIL',flush=True)
        return result.returncode
    finally:
        compose(case,'stop',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

cases=json.loads((LOCAL/'cases.json').read_text())
selected=[c for c in cases if not sys.argv[1:] or c['name'] in sys.argv[1:]]
with ThreadPoolExecutor(max_workers=int(os.environ.get('CC_MATRIX_WORKERS','2'))) as pool:
    results=list(pool.map(run,selected))
sys.exit(any(results))
