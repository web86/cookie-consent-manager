#!/usr/bin/env python3
"""Read-only source validation and PHP regressions inside the isolated test container."""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parents[2]
container = 'cookie-consent-acceptance-audit-visibility-1'
results = []

def run(name, command):
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    results.append({'name': name, 'result': 'PASS' if result.returncode == 0 else 'FAIL',
                    'output': (result.stdout + result.stderr).strip()})
    print(results[-1]['result'], name)

suites = ['tests/php.php', 'tests/manager-i18n-php.php', 'tests/manager-ux-php.php',
          'tests/viewer/php.php', 'tests/beta21/php.php', 'tests/beta24/php.php',
          'tests/elements/php.php', 'tests/beta30/php.php', 'tests/beta31/php.php',
          'tests/beta33/php.php', 'tests/audit-visibility/php.php']
for suite in suites:
    run(suite, ['docker', 'exec', container, 'php', '/opt/cc-source/' + suite])
php_files = sorted(str(p.relative_to(root)) for folder in ['server', '_build', 'tests'] for p in (root / folder).rglob('*.php'))
run('PHP syntax', ['docker', 'exec', container, 'sh', '-c',
    'for file do php -l "/opt/cc-source/$file" || exit; done', 'sh', *php_files])
js_files = sorted(str(p.relative_to(root)) for folder in ['assets', '_build', 'examples', 'tests'] for p in (root / folder).rglob('*') if p.suffix in ('.js', '.mjs'))
failures = []
for filename in js_files:
    r = subprocess.run(['node', '--check', filename], cwd=root, capture_output=True, text=True)
    if r.returncode:
        failures.append({'path': filename, 'error': r.stderr})
results.append({'name': 'JS syntax', 'result': 'FAIL' if failures else 'PASS', 'files': len(js_files), 'errors': failures})
report = {'php_linted': len(php_files), 'js_checked': len(js_files), 'failed': sum(r['result'] == 'FAIL' for r in results), 'results': results}
output = root / '.local/audit-visibility/evidence/regression.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'results'}))
raise SystemExit(bool(report['failed']))
