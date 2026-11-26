"""Disposable native Windows MODX fixture. No mocked MODX APIs or production credentials."""
from pathlib import Path
import os,sys,json,subprocess,zipfile,urllib.request,hashlib,secrets,xml.etree.ElementTree as ET
repo=Path(__file__).resolve().parents[2];work=Path(os.environ['CC_NATIVE_WORK']).resolve();major=int(json.loads((repo/'_build/package.json').read_text())['name'].endswith('3'))+2
version='2.8.8' if major==2 else '3.2.4';product='cookieconsentmanager'+('3' if major==3 else '')
def call(args,cwd=None):subprocess.run(args,cwd=cwd,check=True)
if sys.argv[1]=='prepare':
 work.mkdir(parents=True,exist_ok=False);(work/'private').mkdir();(work/'evidence').mkdir();(work/'artifacts').mkdir()
 archive=work/'modx.zip';url=f'https://modx.s3.amazonaws.com/releases/{version}/modx-{version}-pl.zip'
 urllib.request.urlretrieve(url,archive)
 expected={'2.8.8':'e2eca7e39406a379ae337ccc552d56c69eec0b37697218226a0bbfef50d072a0','3.2.4':'2f594240d58c1c003de89eb5f50f615ee177ec624f48d8494476197048b7adc2'}[version]
 digest=hashlib.sha256(archive.read_bytes()).hexdigest()
 if digest!=expected:raise RuntimeError('MODX distribution checksum mismatch')
 with zipfile.ZipFile(archive) as z:z.extractall(work/'unpack')
 next((work/'unpack').iterdir()).rename(work/'public_html');(work/'unpack').rmdir()
 password=secrets.token_hex(24);print('::add-mask::'+password)
 site=(work/'public_html').as_posix()+'/'
 xml=ET.parse(work/'public_html/setup/config.dist.new.xml');root=xml.getroot()
 fields={'database_server':'127.0.0.1;port=3307','database':'cc_windows_native','database_user':'root','database_password':'','database_connection_charset':'utf8mb4','database_charset':'utf8mb4','database_collation':'utf8mb4_unicode_ci','http_host':'127.0.0.1:8090','inplace':'1','unpacked':'0','cmsadmin':'acceptance','cmspassword':password,'cmsadminemail':'test@example.invalid','core_path':site+'core/','context_mgr_path':site+'manager/','context_mgr_url':'/manager/','context_connectors_path':site+'connectors/','context_connectors_url':'/connectors/','context_web_path':site,'context_web_url':'/','remove_setup_directory':'0','language':'en'}
 for k,v in fields.items():
  node=root.find(k)
  if node is None:node=ET.SubElement(root,k)
  node.text=v
 xml.write(work/'private/setup.xml',encoding='utf-8',xml_declaration=True)
 config={'major':major,'modx':version+'-pl','product':product,'site':site,'origin':'http://127.0.0.1:8090','username':'acceptance','password':password,'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'modx_distribution_sha256':digest}
 (work/'private/config.json').write_text(json.dumps(config))
 # Runtime source is a snapshot of this exact PR head. Only version metadata is overridden.
 snapshot=work/'source.zip';call(['git','archive','--format=zip','-o',str(snapshot),'HEAD'],repo)
 with zipfile.ZipFile(snapshot) as z:z.extractall(work/'candidate')
 call(['php',str(repo/'tests/windows-native/fixture.php'),'prepare-db'])
 call(['php','index.php','--installmode=new','--config='+str(work/'private/setup.xml')],work/'public_html/setup')
 call(['php',str(repo/'tests/windows-native/fixture.php'),'relocate'])
 (work/'public_html/setup').rename(work/'setup-disabled')
 print('Native MODX setup and relocated core/assets ready')
elif sys.argv[1]=='build':
 config=json.loads((work/'private/config.json').read_text());source=work/'candidate'
 for index in [125,126]:
  metadata=json.loads((source/'_build/package.json').read_text());metadata.update(version='1.0.9',release='beta',release_index=index)
  (source/'_build/package.json').write_text(json.dumps(metadata,indent=2)+'\n')
  call(['node','_build/version.mjs'],source)
  manifest=json.loads((source/'_build/frontend-manifest.json').read_text());manifest['package_version']=f'1.0.9-beta{index}';(source/'_build/frontend-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
  out=work/('baseline' if index==125 else 'artifacts');out.mkdir(exist_ok=True)
  call(['php',str(source/'_build/build.php'),config['site'],str(out)])
  archive=out/f'{product}-1.0.9-beta{index}.transport.zip'
  call(['python',str(source/'_build/normalize.py'),str(archive)])
  call(['php',str(source/'_build/verify.php'),str(archive),str(work/'private/core')])
  if index==126:
   # Ensure only three intended version metadata files differ from the PR snapshot.
   with zipfile.ZipFile(work/'source.zip') as z:
    changed=[n for n in z.namelist() if not n.endswith('/') and (source/n).read_bytes()!=z.read(n)]
   assert sorted(changed)==sorted(['_build/package.json','_build/frontend-manifest.json','server/src/CookieConsentVersion.php']),changed
   (work/'artifacts/provenance.json').write_text(json.dumps({'source_sha':config['source_sha'],'version':'1.0.9-beta126','product':product,'modx':config['modx'],'php':subprocess.check_output(['php','-r','echo PHP_VERSION;'],text=True),'source_overrides':changed,'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'status':'PRERELEASE_TEST_ONLY'},indent=2)+'\n')
else:raise RuntimeError('Unknown phase')
