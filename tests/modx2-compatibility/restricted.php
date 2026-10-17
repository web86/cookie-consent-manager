<?php
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/local'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
$name='ccm-permission-fixture';$password=bin2hex(random_bytes(24));
$user=$modx->getObject('modUser',['username'=>$name])?:$modx->newObject('modUser');$user->set('username',$name);$user->set('active',true);$user->set('password',$password);$user->setSudo(false);if(!$user->save())throw new RuntimeException('User');
$profile=$modx->getObject('modUserProfile',['internalKey'=>$user->get('id')])?:$modx->newObject('modUserProfile');$profile->fromArray(['internalKey'=>$user->get('id'),'fullname'=>'CCM permission fixture','email'=>'ccm-permission@example.invalid','blocked'=>false,'failedlogincount'=>0,'blockeduntil'=>0],'',true,true);if(!$profile->save())throw new RuntimeException('Profile');
$group=$modx->getObject('modUserGroup',['name'=>$name])?:$modx->newObject('modUserGroup');$group->set('name',$name);$group->save();
$member=$modx->getObject('modUserGroupMember',['user_group'=>$group->get('id'),'member'=>$user->get('id')])?:$modx->newObject('modUserGroupMember');$member->fromArray(['user_group'=>$group->get('id'),'member'=>$user->get('id'),'role'=>1]);$member->save();
$adminData=$modx->getObject('modAccessPolicy',['name'=>'Administrator'])->get('data');$adminData['cookie_consent_manage']=false;$adminData['cookie_consent_view_logs']=false;
$policy=$modx->getObject('modAccessPolicy',['name'=>$name])?:$modx->newObject('modAccessPolicy');$policy->fromArray(['name'=>$name,'template'=>1,'data'=>$adminData]);$policy->save();
$access=$modx->getObject('modAccessContext',['target'=>'mgr','principal'=>$group->get('id'),'principal_class'=>'modUserGroup'])?:$modx->newObject('modAccessContext');$access->fromArray(['target'=>'mgr','principal'=>$group->get('id'),'principal_class'=>'modUserGroup','authority'=>9999,'policy'=>$policy->get('id')]);$access->save();
$modx->cacheManager->refresh();
file_put_contents('/opt/cc-private/restricted-manager.json',json_encode(['username'=>$name,'password'=>$password]));chmod('/opt/cc-private/restricted-manager.json',0600);
echo "Restricted fixture user created\n";
