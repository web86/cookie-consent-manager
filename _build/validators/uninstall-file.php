<?php
if(($options[xPDOTransport::PACKAGE_ACTION]??0)!==xPDOTransport::ACTION_UNINSTALL)return true;
// Native payload disables missing/retained targets; validate again before deletion.
if(empty($this->payload['uninstall_files']))return true;
$file=eval($object['target']).$object['name'];
return !is_link($file)&&is_file($file)&&realpath($file)===$file&&(stat($file)['nlink']??0)===1&&hash_file('sha256',$file)===$this->payload['expected_sha256'];
