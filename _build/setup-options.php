<?php
// Read-only wizard markup: never collect/write the Origin or HMAC secret here.
$output='<h3>Cookie Consent Manager — safe beta setup</h3><p>Installation does not edit templates or enable services. Existing configuration and private monthly logs are preserved. Audit stays unconfigured until a private log directory and private config have been verified.</p>';
$output.='<p>For a MODX core inside DOCUMENT_ROOT, first create a writable canonical private directory outside DOCUMENT_ROOT for package ownership/rollback state. Supply it below. For a private core it can remain blank.</p><label>Private package-state directory <input type="text" name="cc_package_state_dir" style="width:95%" autocomplete="off"></label>';
$output.='<p>After installation: open Extras → Cookie Consent Manager; grant cookie_consent_manage only to the intended mgr users; configure private audit JSON if server environment variables are unavailable; connect the staging template manually; remove direct scripts/noscript and use inert map markup. Do not paste secrets into settings or texts.</p>';
return $output;
