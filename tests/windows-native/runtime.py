"""Select an exact official Windows NTS patch into an isolated directory (no system INI edits)."""
from pathlib import Path
import os,json,zipfile,urllib.request,subprocess,hashlib
version=os.environ['CC_REQUESTED_PHP'];vs='vs16' if version.startswith('8.3.') else 'vs17';name=f'php-{version}-nts-Win32-{vs}-x64.zip'
root=Path(os.environ['RUNNER_TEMP'])/('cc-php-'+version);root.mkdir(exist_ok=False);archive=root/'php.zip';url=None
for base in ['https://downloads.php.net/~windows/releases/','https://downloads.php.net/~windows/releases/archives/']:
 try:urllib.request.urlretrieve(base+name,archive);url=base+name;break
 except Exception:pass
if url is None:raise RuntimeError('Requested official PHP binary unavailable: '+name)
with zipfile.ZipFile(archive) as z:z.extractall(root)
ini=(root/'php.ini-production').read_text();ini+='\n'+f'extension_dir="{(root/"ext").as_posix()}"\n'
for ext in ['curl','gd','mbstring','mysqli','openssl','pdo_mysql','zip']:ini+='extension='+ext+'\n'
ini+=f'zend_extension="{(root/"ext/php_opcache.dll").as_posix()}"\nmemory_limit=512M\nmax_execution_time=180\ndate.timezone=UTC\ndisplay_errors=0\nlog_errors=1\n'
(root/'php.ini').write_text(ini)
code="echo json_encode(['php'=>PHP_VERSION,'zts'=>PHP_ZTS,'int_size'=>PHP_INT_SIZE,'extensions'=>get_loaded_extensions()]);"
info=json.loads(subprocess.check_output([str(root/'php.exe'),'-r',code],text=True));assert info['php']==version,info
assert all(ext in info['extensions'] for ext in ['dom','json','mbstring','pdo_mysql','zip','Zend OPcache']),info
info.update(binary_url=url,archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),php_exe_sha256=hashlib.sha256((root/'php.exe').read_bytes()).hexdigest())
base=Path(os.environ['CC_MATRIX_ROOT']);(base/'results').mkdir(parents=True,exist_ok=True);(base/'results/runtime.json').write_text(json.dumps(info,indent=2)+'\n')
with open(os.environ['GITHUB_PATH'],'a') as f:f.write(str(root)+'\n')
with open(os.environ['GITHUB_ENV'],'a') as f:f.write('PHPRC='+str(root)+'\n')
print('Exact isolated runtime:',json.dumps(info))
