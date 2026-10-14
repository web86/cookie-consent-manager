<?php
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/local'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
$name='ccm-permission-fixture';$password=bin2hex(random_bytes(24));
$user=$modx->getObject('MODX\Revolution\modUser',['username'=>$name])?:$modx->newObject('MODX\Revolution\modUser');$user->set('username',$name);$user->set('active',true);$user->set('password',$password);$user->setSudo(false);if(!$user->save())throw new RuntimeException('User');
$profile=$modx->getObject('MODX\Revolution\modUserProfile',['internalKey'=>$user->get('id')])?:$modx->newObject('MODX\Revolution\modUserProfile');$profile->fromArray(['internalKey'=>$user->get('id'),'fullname'=>'CCM permission fixture','email'=>'ccm-permission@example.invalid','blocked'=>false,'failedlogincount'=>0,'blockeduntil'=>0],'',true,true);if(!$profile->save())throw new RuntimeException('Profile');
$group=$modx->getObject('MODX\Revolution\modUserGroup',['name'=>$name])?:$modx->newObject('MODX\Revolution\modUserGroup');$group->set('name',$name);$group->save();
$member=$modx->getObject('MODX\Revolution\modUserGroupMember',['user_group'=>$group->get('id'),'member'=>$user->get('id')])?:$modx->newObject('MODX\Revolution\modUserGroupMember');$member->fromArray(['user_group'=>$group->get('id'),'member'=>$user->get('id'),'role'=>1]);$member->save();
$adminData=$modx->getObject('MODX\Revolution\modAccessPolicy',['name'=>'Administrator'])->get('data');$adminData['cookie_consent_manage']=false;
$policy=$modx->getObject('MODX\Revolution\modAccessPolicy',['name'=>$name])?:$modx->newObject('MODX\Revolution\modAccessPolicy');$policy->fromArray(['name'=>$name,'template'=>1,'data'=>$adminData]);$policy->save();
$access=$modx->getObject('MODX\Revolution\modAccessContext',['target'=>'mgr','principal'=>$group->get('id'),'principal_class'=>'MODX\Revolution\modUserGroup'])?:$modx->newObject('MODX\Revolution\modAccessContext');$access->fromArray(['target'=>'mgr','principal'=>$group->get('id'),'principal_class'=>'MODX\Revolution\modUserGroup','authority'=>9999,'policy'=>$policy->get('id')]);$access->save();
$modx->cacheManager->refresh();
file_put_contents('/opt/cc-private/restricted-manager.json',json_encode(['username'=>$name,'password'=>$password]));chmod('/opt/cc-private/restricted-manager.json',0600);
echo "Restricted fixture user created\n";
