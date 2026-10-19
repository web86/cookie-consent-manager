// Reuse the complete compatibility acceptance with explicit identities and isolated cases.
process.env.CC_MATRIX_DIRECTORY='.local/package-rename';
process.env.CC_MATRIX_SIGNATURE='cookieconsentmanager-1.0.8-pl4';
process.env.CC_MATRIX_ARTIFACTS='.local/package-rename/artifacts/release'+(process.env.CC_RENAME_FINAL?'-rc':'');
if(process.env.CC_RENAME_FINAL)process.env.CC_MATRIX_CASES='final-cases.json';
process.env.CC_MATRIX_PRIOR_SIGNATURE='cookieconsent-1.0.8-pl3';
process.env.CC_MATRIX_PRIOR_FOLDER='.local/package-rename/artifacts/prior';
process.env.CC_MATRIX_COMPONENT='cookieconsentmanager';
process.env.CC_MATRIX_FIXTURE='/opt/cc-source/tests/package-rename/fixture.php';
await import('../modx2-compatibility/browser.mjs');
