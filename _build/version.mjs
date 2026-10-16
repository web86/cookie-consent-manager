import {readFileSync,writeFileSync} from 'node:fs';
const meta=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
const override=process.argv.slice(2).find(v=>/^[0-9]+$/.test(v));
if(override){if(Number(override)<1||Number(override)>999)throw Error('Invalid beta index');meta.release_index=Number(override);}
const version=meta.version+(meta.release?'-'+meta.release+meta.release_index:'');
const content=`<?php\ndeclare(strict_types=1);\n/** Generated from _build/package.json; active runtime version, not a stale package DB row. */\nfinal class CookieConsentVersion { public const VERSION = '${version}'; }\n`;
const target=new URL('../server/src/CookieConsentVersion.php',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==content)throw Error('Stale package version; run node _build/version.mjs');}else writeFileSync(target,content);
console.log('Package version '+version);
