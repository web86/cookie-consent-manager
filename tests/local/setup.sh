#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 tests/modx3/prepare.py
cc3_compose=(docker compose --env-file .local/modx3/private/compose.env -f tests/modx3/compose.yaml)
"${cc3_compose[@]}" up -d --build db web clean fresh pristine php82
for service in web clean fresh pristine; do
  "${cc3_compose[@]}" exec -T "$service" php /opt/cc-source/tests/modx3/install.php
  if "${cc3_compose[@]}" exec -T "$service" test -d /var/www/html/setup; then
    "${cc3_compose[@]}" exec -T -w /var/www/html/setup "$service" php index.php --installmode=new --config=/opt/cc-private/setup.xml
  fi
  "${cc3_compose[@]}" exec -T "$service" php /opt/cc-source/tests/modx3/finish.php
done
printf '%s\n' 'MODX 3 fixtures ready on 20888/20889. Build and install the native package before regression.'
