import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
export const origin = 'http://127.0.0.1:8888';
export const compose = ['compose', '--env-file', '.local/private/compose.env', '-f', 'tests/local/compose.yaml'];
export function docker(args, input) { return execFileSync('docker', [...compose, 'exec', '-T', ...args], { input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
export function setting(key, value) { return docker(['web', 'php', '/opt/cc-source/tests/local/change-setting.php', key], value); }
export const registry = JSON.parse(readFileSync('.local/private/base-registry.json', 'utf8'));
// Existing settings are migrated by PHP; direct public test fixtures use the new schema.
for (const s of registry.services) if (s.loader === 'yandex') delete s.config.clientId;
export function evidence(name, data) { mkdirSync('.local/evidence', { recursive: true }); writeFileSync(`.local/evidence/${name}.json`, JSON.stringify(data, null, 2)); }
