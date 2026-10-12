#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 tests/local/prepare.py
cc_compose=(docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml)
"${cc_compose[@]}" up -d --build
if [[ ! -f .local/site/config.core.php ]]; then
  "${cc_compose[@]}" exec -T web php /opt/cc-source/tests/local/install.php
  "${cc_compose[@]}" exec -T -w /var/www/html/setup web php index.php --installmode=new --config=/opt/cc-private/setup.xml > .local/private/install.log
fi
"${cc_compose[@]}" exec -T web php /opt/cc-source/tests/local/sync.php
"${cc_compose[@]}" exec -T web php /opt/cc-source/server/bin/install-modx2.php /var/www/html /opt/cc-private/logs
"${cc_compose[@]}" exec -T web php /opt/cc-source/tests/local/provision.php
# setup and its generated XML must never be accessible through the local HTTP server.
"${cc_compose[@]}" exec -T web php -r 'if(is_dir("/var/www/html/setup")){exec("mv /var/www/html/setup /opt/cc-private/completed-setup",$out,$code);if($code!==0){exec("cp -a /var/www/html/setup /opt/cc-private/completed-setup && rm -rf /var/www/html/setup",$out,$code);if($code!==0)exit(1);}}chown("/opt/cc-private/config.php","www-data");chmod("/opt/cc-private/config.php",0600);'
printf '%s\n' 'Local MODX fixture: http://127.0.0.1:8888/ (mock only)'
