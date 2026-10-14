import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
export const origin = 'http://127.0.0.1:18888';
export const compose = ['compose', '--env-file', '.local/modx3/private/compose.env', '-f', 'tests/modx3/compose.yaml'];
let checked=false;
export function docker(args, input) { if(!checked){execFileSync('docker',[...compose,'exec','-T','web','php','/opt/cc-source/tests/modx3/guard.php'],{stdio:'pipe'});checked=true;} return execFileSync('docker', [...compose, 'exec', '-T', ...args], { input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
export function setting(key, value) { return docker(['web', 'php', '/opt/cc-source/tests/local/change-setting.php', key], value); }
export const registry = JSON.parse(readFileSync('.local/modx3/private/base-registry.json', 'utf8'));
// Existing settings are migrated by PHP; direct public test fixtures use the new schema.
for (const s of registry.services) if (s.loader === 'yandex') delete s.config.clientId;
export function evidence(name, data) { mkdirSync('.local/modx3/evidence', { recursive: true }); writeFileSync(`.local/modx3/evidence/${name}.json`, JSON.stringify(data, null, 2)); }
