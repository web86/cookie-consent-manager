<?php
declare(strict_types=1);
// Run against an official MODX autoloader on PHP 8.1 and 8.2.
$argv[1]='boot';require __DIR__.'/fixture.php';
$source=getenv('CC_MATRIX_SOURCE_ROOT')?:dirname(__DIR__,2);
$metadata=json_decode(file_get_contents($source.'/_build/package.json'),true,8,JSON_THROW_ON_ERROR);
if($metadata['minimum_modx']!=='3.1.2'||$metadata['maximum_modx']!=='3.3.0'||$metadata['minimum_php']!=='8.1.0')throw new RuntimeException('Release metadata range');
$build=file_get_contents($source.'/_build/build.php');
if(!str_contains($build,"'modx'=>'>=3.1.2,<3.3.0'")||!str_contains($build,"'php'=>'>=8.1.0'"))throw new RuntimeException('Native package range');
$manifest=json_decode(file_get_contents($source.'/_build/frontend-manifest.json'),true,16,JSON_THROW_ON_ERROR);
$versionRelease=$metadata['version'].'-'.$metadata['release'].$metadata['release_index'];
if($manifest['package_version']!==$versionRelease)throw new RuntimeException('Stale frontend release stamp');
$n=0;
foreach(['2.8.8-pl'=>false,'3.0.6-pl'=>false,'3.1.1-pl'=>false,'3.1.2-pl'=>true,'3.2.0-pl'=>true,'3.2.1-pl'=>true,'3.2.2-pl'=>true,'3.2.3-pl'=>true,'3.2.4-pl'=>true,'3.3.0-pl'=>false] as $version=>$allowed){
    $xpdo=new class($version){
        public string $diagnostic='';
        public function __construct(private string $version){}
        public function getVersionData(){return ['full_version'=>$this->version];}
        public function getObject(...$args){throw new RuntimeException('matrix_reached_objects');}
        public function log($level,$message){$this->diagnostic=$message;}
    };
    $transport=(object)['xpdo'=>$xpdo];$options=[];$spec=['files'=>[]];
    $result=include $source.'/_build/preflight.php';
    if($result!==false||str_contains($xpdo->diagnostic,'matrix_reached_objects')!==$allowed)throw new RuntimeException('Preflight boundary: '.$version.' '.$xpdo->diagnostic);
    $n++;
}
echo json_encode(['result'=>'PASS','assertions'=>$n+3,'php'=>PHP_VERSION])."\n";
