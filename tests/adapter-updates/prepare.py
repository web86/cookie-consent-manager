"""Prepare a separate project; never reset an existing site, database, or artifact."""
from pathlib import Path
import secrets, shutil, sys
root=Path(__file__).resolve().parents[2]
reference=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent.parent
out=root/'.local/adapter-updates';(out/'private').mkdir(parents=True,exist_ok=True)
env=out/'private/compose.env'
if not env.exists():env.write_text('CC_DB_PASSWORD='+secrets.token_hex(24)+'\n');env.chmod(0o600)
name=sys.argv[2] if len(sys.argv)>2 else 'build'
if not name.replace('-','').isalnum():raise ValueError('Fixture name')
case=out/'cases'/name
if case.exists():raise RuntimeError('Existing case preserved; choose a new case name')
source=reference/'.local/download/modx-2.8.8-pl'
if not source.is_dir():raise RuntimeError('Official local MODX 2.8.8 archive required')
shutil.copytree(source,case/'site');(case/'private').mkdir()
active=out/'active'
if active.is_symlink():active.rename(out/('active-before-'+name))
elif active.exists():raise RuntimeError('Unexpected active fixture')
active.symlink_to('cases/'+name,target_is_directory=True)
(out/'artifacts').mkdir(exist_ok=True);(out/'evidence').mkdir(exist_ok=True)
print(case)
