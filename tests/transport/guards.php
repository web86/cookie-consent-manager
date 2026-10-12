<?php
require __DIR__.'/../../_build/lifecycle.php';
$cases=[['8.0.30','2.8.8-pl',false],['8.1.0','2.8.8-pl',true],['8.2.34','2.8.8-pl',true],['8.4.0','2.8.9-pl',true],['8.2.34','2.8.7-pl',false],['8.2.34','3.0.0-pl',false],['7.4.33','3.0.0-pl',false]];
foreach($cases as [$php,$modx,$expected])if(CookieConsentPackageLifecycle::environment($php,$modx)!==$expected)throw new RuntimeException('Environment guard regression');
echo json_encode(['suite'=>'Pure version guard unit tests (not actual alternate runtimes)','tests'=>7,'assertions'=>7,'failed'=>0,'result'=>'PASS'])."\n";
