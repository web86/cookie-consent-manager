# Button translations regression

Run the resolver checks with `php tests/manager-i18n-php.php`. The native
suite uses Chromium and a disposable local MODX site with the previous public
transport installed. It updates the test site and its settings.

Use the [Modstore fixture](../modstore/README.md) to provision MODX 2 or 3
with its own database. For this test keep the case's Compose file in the case
directory, mount this branch at `/opt/cc-source`, mount the case directory at
`/opt/cc-case`, and keep `compose.env` one level above the case directory.
The case directory name must match the Compose service name. It must contain
`private/manager.json` from the fixture setup.

Build and verify the candidate transport in a directory visible to that
container. Supply the local case directory and the candidate path as seen by
the container.

```sh
node tests/button-translations/native.mjs /path/to/m288p82 /opt/cc-case/evidence/candidate/cookieconsentmanager-1.0.8-pl7.transport.zip
```

Run the same script on the MODX 3 branch with the MODX 3 case and ZIP. The
suite checks the native upgrade against the previous package, the real Manager
and public site, including the local audit receiver. The external video
response is intercepted by Chromium.
