// Keep exact deployed-code assertions for either the release prebuilt or the
// independently generated PHP candidate. Only successful-build metadata differs.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
function parse(bytes){
 const source=bytes.toString('utf8'),prefix='// CookieConsentBundle ';
 if(!source.startsWith(prefix))return {body:bytes,meta:null};
 const newline=source.indexOf('\n'),meta=JSON.parse(source.slice(prefix.length,newline));
 const body=Buffer.from(source.slice(newline+1));
 assert.equal(meta.version,sha(body),'Ready bundle metadata matches its complete JS body');
 assert.match(meta.fingerprint,/^[a-f0-9]{64}$/);
 return {body,meta};
}
const expected=()=>parse(readFileSync(process.env.CC_FRONTEND_EXPECTED||'assets/js/cookie-consent/cookie-consent.min.js'));
export function frontendHash(bytes){
 const actual=parse(bytes),reference=expected();
 assert.equal(Boolean(actual.meta),Boolean(reference.meta),'Expected build mechanism');
 if(reference.meta)assert.equal(actual.meta.fingerprint,reference.meta.fingerprint,'Exact manifest/source fingerprint');
 return sha(actual.body);
}
export function expectedFrontendHash(){return sha(expected().body);}
export function expectedFrontendVersion(){const value=expected();return value.meta?.version||sha(value.body).slice(0,20);}
