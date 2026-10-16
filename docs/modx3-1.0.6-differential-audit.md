# Pre-implementation differential audit (2026-10-16)

Source: `codex/modx2-adapter-cache-build`, `db0a7229715bcde08eef71894e08dd6526704954`, stable 1.0.6.
Target: actual local/remote-tracking `modx3`, `1fd687249fa474c2ce3ba21ddc64b0344d3f1b6a`, 0.1.0-beta3. Both original working trees were clean. New branch `codex/modx3-sync-1.0.6` starts at that target, in its own worktree. Next version: 0.1.0-beta4. The other unmerged parity worktree is background evidence only, not the source branch.

| Area | Existing MODX 3 | Required delta from 1.0.6 |
| --- | --- | --- |
| PHP/platform | Namespaced MODX/xPDO, aliases off, PHP >=8.1, MODX >=3.2.4,<3.3 | Retain APIs, namespace, paths, native controllers/processors and Manager cultureKey |
| Transport | Real modPackageBuilder, object/file/script vehicles, canonical metadata/IDs, native preserved map | Retain builder/lifecycle, add sixth canonical Video, cache hook and closed runtime allowlist |
| Audit/security | ACK/JSONL, schema1/2, ACL/CSV, trusted visibility, replay/origin/rate checks | Add source schema3/category-only records, keep protections and old records |
| Registry/consent | Fixed adapter categories, categories_v1/provider fingerprints | Port reviewed arbitrary categories, instances, custom_js, categories_v2 conservative migration and composition epochs |
| JavaScript | Older monolithic analytics/marketing factories and map handling | Exact 21-file ordered source manifest, extracted services, existing embeds.js lifecycle, video adapters, public mountEmbeds facade |
| Maps/video | Native Map, stock map keys, no Video | Port Map contract, Video URL validator/snippet, poster/display options, generic inert template; no second store/observer/iframe manager |
| Texts | RU/EN renderer/lexicons and overrides | Exact shared notice/button fallback, general + two map overrides, preserve JSON on upgrade |
| Manager | Existing routing, ACL, authenticated APIs and guide | Unified service editor, category moves, editable texts, runtime version/cache state and force rebuild |
| Bundle | Prebuilt esbuild only | PHP Peast administrative build, OnSiteRefresh guard, atomic rollback, prebuilt fallback, saved timestamp selection without frontend source IO |
| Guide | Canonical bilingual JSON -> generated PHP/readme | Reuse reviewed 1.0.6 six sections, generate outputs, adapt platform references only |
| Payload | Broad directory walk incl. test mock SDKs/maps | Closed allowlist, all real dependencies incl. referenced services/mock-marketing.js and Peast license; exclude mock/, tests/docs/maps/logs |

Shared behavior is ported from the pinned source; platform boundaries are individually adapted. MODX 2 builder is not copied. Existing MODX 3 startup JSON registration outside Fenom, native routing, transaction APIs, permissions and system setting preservation remain. Old JS files not referenced by the source manifest are retired from the runtime payload. Source callbacks, SDK, category versions/TTL/policy, iframe revoke and poster policy remain exact 1.0.6 contracts.

Baseline verification uses isolated project `cookie-consent-modx3-sync106`, ports 20888–20891 and a new database volume, official local MODX 3.2.4 archive SHA256 `2f594240d58c1c003de89eb5f50f615ee177ec624f48d8494476197048b7adc2`. Existing MODX 2 and unrelated MODX 3 installations are preserved. Historical 497/4095 is not claimed as a new run. The documented pdoTools 3.1.0 warm-cache failure must be rechecked and reported as a dependency failure if reproduced. No dependency patch is included.
