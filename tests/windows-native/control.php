<?php
$argv[1]='boot';require __DIR__.'/fixture.php';
$T=$major===2?'xPDOTransport':'xPDO\\Transport\\xPDOTransport';
if($major===2){$modx->loadClass('transport.modPackageBuilder','',false,true);$builderClass='modPackageBuilder';}else $builderClass='MODX\\Revolution\\Transport\\modPackageBuilder';
$out=$work.'/control';if(!is_dir($out))mkdir($out,0700);
foreach(['plain','embedded'] as $variant){
 $packageName='ccwindowscontrol'.$variant;$dir=$out.'/'.$variant;mkdir($dir,0700);$builder=new $builderClass($modx);$builder->directory=$dir.'/';$builder->createPackage($packageName,'0.0.1','beta129');
 $guard=$variant==='embedded'?"if(!class_exists('CCWindowsEmbeddedControl',false)){final class CCWindowsEmbeddedControl{public static function ok():bool{return true;}}}\nif(!CCWindowsEmbeddedControl::ok())return false;\n":'';
 foreach([1,2] as $number){
  $script=$dir.'/hook'.$number.'.php';file_put_contents($script,"<?php\n".$guard."return true;\n");
  if($number===2){$marker=$dir.'/marker.php';file_put_contents($marker,"<?php\nreturn 129;\n");$target='return $transport->xpdo->getOption(\'core_path\').\'components/'.$packageName.'/\';';$v=$builder->createVehicle(['source'=>$marker,'target'=>$target],['vehicle_class'=>$major===2?'xPDOFileVehicle':'xPDO\\Transport\\xPDOFileVehicle',$T::INSTALL_FILES=>true,$T::UNINSTALL_FILES=>true]);
   if($variant==='embedded')$v->validate('php',['source'=>$script]);if(!$builder->putVehicle($v))throw new RuntimeException('control file vehicle');
  }
  $v=$builder->createVehicle(['source'=>$script],['vehicle_class'=>$major===2?'xPDOScriptVehicle':'xPDO\\Transport\\xPDOScriptVehicle']);if(!$builder->putVehicle($v))throw new RuntimeException('control script vehicle');
 }
 if(!$builder->pack())throw new RuntimeException('control pack');copy($dir.'/'.$packageName.'-0.0.1-beta129.transport.zip',$out.'/'.$packageName.'-0.0.1-beta129.transport.zip');
}
echo "Built two native controls without Cookie Consent Manager\n";
