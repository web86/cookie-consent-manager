"""Add before/after application log markers ONLY to the disposable MODX/xPDO copy."""
from pathlib import Path
import os,json,re,hashlib
work=Path(os.environ['CC_NATIVE_WORK']);core=work/'private/core';changes=[]
for p in core.rglob('*.php'):
 name=p.name.lower()
 if name not in ['xpdotransport.class.php','xpdotransport.php','xpdoscriptvehicle.class.php','xpdoscriptvehicle.php','xpdovehicle.class.php','xpdovehicle.php','xpdofilevehicle.class.php','xpdofilevehicle.php']:continue
 s=p.read_text(errors='strict');old=s
 if name in ['xpdotransport.class.php','xpdotransport.php']:
  s=s.replace('$payload = include ($objFile);',"\\cc_stage('native.payload.before',['file'=>$objFile]);\n                $payload = include ($objFile);\n                \\cc_stage('native.payload.after',['file'=>$objFile]);")
  s=s.replace("$processed[$vehicleMeta['guid']] = $vehicle->uninstall($this, $vOptions);", "\\cc_stage('native.vehicle.uninstall.before',['file'=>$vehicleMeta['filename']]);\n                    $processed[$vehicleMeta['guid']] = $vehicle->uninstall($this, $vOptions);\n                    \\cc_stage('native.vehicle.uninstall.after',['file'=>$vehicleMeta['filename']]);")
 if name in ['xpdoscriptvehicle.class.php','xpdoscriptvehicle.php']:
  s=s.replace('if (!$installed = include ($fileSource)) {',"\\cc_stage('native.script.before',['file'=>$fileSource]);\n                if (!$installed = include ($fileSource)) {")
  s=s.replace('        return $installed;', "        \\cc_stage('native.script.after');\n        return $installed;")
 if name in ['xpdovehicle.class.php','xpdovehicle.php']:
  s=s.replace('if (!$validated = include ($fileSource)) {', "\\cc_stage('native.validator.before',['file'=>$fileSource]);\n                        if (!$validated = include ($fileSource)) {")
  s=s.replace('        return $validated;', "        \\cc_stage('native.validator.after');\n        return $validated;")
 if name in ['xpdofilevehicle.class.php','xpdofilevehicle.php']:
  s=s.replace('$uninstalled = $this->_uninstallFiles($transport, $options);',"\\cc_stage('native.files.before',['target'=>$this->payload['relative_target']??null]);\n        $uninstalled = $this->_uninstallFiles($transport, $options);\n        \\cc_stage('native.files.after');")
 if s!=old:
  p.write_text(s,newline='');changes.append({'file':str(p.relative_to(core)),'original_sha256':hashlib.sha256(old.encode()).hexdigest(),'instrumented_sha256':hashlib.sha256(s.encode()).hexdigest()})
assert len(changes)==4,changes
(work/'evidence/instrumentation.json').write_text(json.dumps(changes,indent=2)+'\n')
print('Added native operation log markers to',len(changes),'disposable xPDO files')
