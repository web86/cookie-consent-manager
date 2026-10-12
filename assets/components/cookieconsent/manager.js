/** MODX 2 CMP: explicit saves, local drafts, server-sanitized isolated previews. */
(() => {
  'use strict';
  const start = async () => {
    const root = document.getElementById('ccm-page'); if (!root) return;
    const boot = window.CookieConsentManagerBootstrap;
    let data, draft, revision, editLanguage, previewLanguage, previewState = 'banner', dirty = false, previewTimer, sequence = 0;
    const api = async (action, values = {}) => {
      let response, json;
      const fail = (code, requestId = '') => Error((data?.managerStrings['m.error'] || boot.errorMessage || 'Request failed; draft retained') + ` (${action}, HTTP ${response?.status || 0}, ${code}${requestId ? ', ' + requestId : ''})`);
      try {
        response = await fetch(boot.connector, { method: 'POST', credentials: 'same-origin', mode: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'modAuth': boot.auth },
          body: new URLSearchParams({ action, HTTP_MODAUTH: boot.auth, ...values }) });
      } catch (_) { throw fail('network'); }
      try { json = await response.json(); } catch (_) { throw fail('invalid_response'); }
      if (!response.ok || !json.success) {
        if (json.message === 'conflict') throw Error(data?.managerStrings['m.conflict'] || 'Conflict');
        const diagnostic = json.object || {};
        const code = diagnostic.code || (/permission|access|auth/i.test(json.message || '') ? 'authorization' : 'processor');
        const reason=data?.managerStrings['m.reason_'+diagnostic.reason];if(reason)throw Error(reason+' ('+action+', HTTP '+response.status+', '+(diagnostic.request_id||code)+')');
        throw fail(code + (diagnostic.reason && /^[a-z_]{1,40}$/.test(diagnostic.reason) ? ':' + diagnostic.reason : ''), diagnostic.request_id);
      }
      return json.object;
    };
    try { data = await api('get'); } catch (e) { root.textContent = e.message; return; }
    const t = key => data.managerStrings['m.' + key] || data.managerStrings[key] || data.lexicons.en['m.' + key] || '…';
    const el = (tag, text, attributes = {}) => { const node = document.createElement(tag); if (text != null) node.textContent = text; for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); return node; };
    const idPatterns = { yandex: /^[0-9]{1,20}$/, mailru: /^[0-9]{1,20}$/, google_ga4: /^G-[A-Z0-9]{4,20}$/, google_ads: /^AW-[0-9]{4,20}$/, google_gtm: /^GTM-[A-Z0-9]{4,20}$/ };
    const clone = value => JSON.parse(JSON.stringify(value));
    draft = { options: clone(data.options), registry: clone(data.registry), texts: clone(data.texts), log_dir: data.log_dir, audit_config_file: data.audit_config_file || '' };
    revision = data.revision; editLanguage = data.managerLanguage; previewLanguage = editLanguage;
    draft.texts.locales[editLanguage] ||= {};
    document.body.classList.add('ccm-manager');
    const scrollHost = root.closest('.x-panel-body'); if (scrollHost) scrollHost.classList.add('ccm-scroll-host');
    let savedForm=JSON.stringify({options:draft.options,registry:draft.registry,texts:draft.texts});
    root.removeAttribute('aria-busy'); root.className = 'ccm-page';
    const header = el('header'); header.append(el('h2', t('title')));
    const save = el('button', t('save'), { type: 'button', id: 'ccm-save', class: 'ccm-primary' });
    const status = el('span', t('unchanged'), { id: 'ccm-status', role: 'status', 'aria-live': 'polite' }); header.append(status, save);
    const layout = el('div', null, { class: 'ccm-layout' }), main = el('div', null, { class: 'ccm-main' }), aside = el('aside', null, { class: 'ccm-preview' });
    root.append(header, layout); layout.append(main, aside);
    const tabs = el('div', null, { class: 'ccm-tabs', role: 'tablist', 'aria-label': t('title') }); main.append(tabs);
    const panels = {};
    for (const key of ['main', 'services', 'texts', 'logs']) {
      const button = el('button', t(key), { type: 'button', role: 'tab', id: 'ccm-tab-' + key, 'aria-controls': 'ccm-panel-' + key, 'aria-selected': String(key === 'main') });
      const panel = el('section', null, { role: 'tabpanel', id: 'ccm-panel-' + key, 'aria-labelledby': button.id, class: 'ccm-panel' }); panel.hidden = key !== 'main'; panels[key] = panel;
      button.onclick = () => { previewLanguage = key === 'texts' ? editLanguage : data.managerLanguage; schedulePreview(); for (const [name, content] of Object.entries(panels)) { content.hidden = name !== key; document.getElementById('ccm-tab-' + name).setAttribute('aria-selected', String(name === key)); } };
      tabs.append(button); main.append(panel);
    }
    function changed() { dirty = true; status.textContent = t('unsaved'); status.dataset.state = 'dirty'; schedulePreview(); }
    function field(container, label, value, callback, type = 'text', id, help) {
      const row = el('label', null, { class: 'ccm-field' }); row.append(el('span', label));
      const input = el(type === 'textarea' ? 'textarea' : 'input', null, { ...(type === 'textarea' ? {} : { type }), ...(id ? { id } : {}) });
      if (type === 'checkbox') input.checked = Boolean(value); else input.value = value ?? '';
      input.addEventListener(type === 'checkbox' ? 'change' : 'input', () => { callback(type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value); changed(); });
      row.append(input); if (help) row.append(el('small', help)); container.append(row); return input;
    }
    field(panels.main, t('ttl_days'), draft.options.ttl_days, v => draft.options.ttl_days = v, 'number', 'ccm-ttl').setAttribute('min', '1');
    document.getElementById('ccm-ttl').setAttribute('max', '3650');

    const buttons = {};
    const legacy = () => { for (const key of ['configure', 'accept_all']) buttons[key].disabled = draft.options.buttons.accept; };
    for (const key of ['reject', 'configure', 'accept_all', 'accept']) buttons[key] = field(panels.main, t('show_' + key), draft.options.buttons[key], v => { draft.options.buttons[key] = v; legacy(); }, 'checkbox', 'ccm-show-' + key);
    legacy(); panels.main.append(el('p', t('legacy_help'), { class: 'ccm-help' }));
    const logMode=el('select',null,{id:'ccm-log-mode','aria-label':t('log_location')});
    for(const mode of ['site','absolute'])logMode.append(el('option',t('log_'+mode),{value:mode}));
    let storedLogDir=data.log_dir;
    const publicRoot=data.documentRoot;
    draft.log_dir_mode=draft.log_dir&&draft.log_dir.startsWith(publicRoot+'/')?'site':'absolute';
    if(draft.log_dir_mode==='site')draft.log_dir=draft.log_dir.slice(publicRoot.length);
    logMode.value=draft.log_dir_mode;panels.logs.append(el('label',t('log_location')),logMode);
    logMode.onchange=()=>{draft.log_dir_mode=logMode.value;changed();};
    field(panels.logs,t('log_dir'),draft.log_dir,v=>draft.log_dir=v,'text','ccm-log-dir',t('log_path_help'));
    const auditState=el('p',t('audit_'+(data.auditStatus?.state||'not_configured')),{id:'ccm-audit-status',role:'status'});panels.logs.append(auditState);
    const enableAudit=el('button',t('audit_enable'),{type:'button',id:'ccm-audit-enable'});panels.logs.append(enableAudit,el('p',t('audit_enable_help'),{class:'ccm-help'}),el('p',t('audit_privacy_warning'),{class:'ccm-help',id:'ccm-audit-warning'}));
    enableAudit.onclick=async()=>{enableAudit.disabled=true;try{
      const result=await api('audit_enable',{log_dir:draft.log_dir,log_dir_mode:draft.log_dir_mode,revision});revision=result.revision;storedLogDir=result.log_dir;
      auditState.textContent=t('audit_ready');status.textContent=t('audit_enable_success');status.dataset.state=dirty?'dirty':'saved';
      // Only journal selection is persisted by this operation; other form drafts stay local.
      const current={options:draft.options,registry:draft.registry,texts:draft.texts};
      dirty=JSON.stringify(current)!==savedForm;
      status.dataset.state=dirty?'dirty':'saved';
    }catch(e){status.textContent=e.message;status.dataset.state='error';}finally{enableAudit.disabled=false;}};
    const advanced=el('details',null,{id:'ccm-advanced'});advanced.append(el('summary',t('advanced')));
    const reconsent=el('button',t('reconsent'),{type:'button',id:'ccm-reconsent'});advanced.append(reconsent);panels.main.append(advanced);
    reconsent.onclick=async()=>{if(dirty){status.textContent=t('save_first');return;}if(!window.confirm(t('reconsent_confirm')))return;
      reconsent.disabled=true;try{const saved=await api('reconsent',{revision});draft.options=saved.options;revision=saved.revision;status.textContent=t('reconsent_success');}catch(e){status.textContent=e.message;status.dataset.state='error';}finally{reconsent.disabled=false;}};
    const integration = el('details', null, { id: 'ccm-integration-help' }); integration.append(el('summary', t('integration_title')), el('p', t('integration_help')));
    integration.append(el('pre', '[[!CookieConsent]]'),el('p',t('remove_direct_scripts')),el('p',t('map_api_help'))); panels.logs.append(integration);
    panels.logs.append(el('h3', t('logs')), el('p', t('logs_help')));

    function textSource(language, key) {
      const base = draft.texts.base_language;
      const service = draft.registry.services.find(s => key.startsWith('service.' + s.key + '.'));
      const serviceFallback = key.endsWith('.map_notice') ? data.lexicons[language]?.map_notice || data.lexicons[base]?.map_notice || data.lexicons.en.map_notice : service ? (key.endsWith('.name') ? service.name : service.purpose) : '';
      return draft.texts.locales[language]?.[key] ?? data.lexicons[language]?.[key] ?? draft.texts.locales[base]?.[key] ?? data.lexicons[base]?.[key] ?? data.lexicons.en[key] ?? serviceFallback;
    }
    function languages(select, selected, available = false) {
      select.replaceChildren(); const codes = [...new Set([...(available ? data.availableLanguages : Object.keys(draft.texts.locales)), selected])].sort();
      for (const code of codes) select.append(el('option', code, { value: code })); select.value = selected;
    }
    function renderServices() {
      panels.services.replaceChildren();
      for (const category of ['analytics', 'marketing', 'external_content']) {
        const group = el('section', null, { class: 'ccm-service-group', 'data-group': category }); group.append(el('h3', data.managerStrings[category + '_name']));
        for (const service of draft.registry.services.filter(s => s.category === category)) {
          const card = el('article', null, { class: 'ccm-service', 'data-service': service.key });
          card.append(el('h4', textSource(data.managerLanguage, 'service.' + service.key + '.name') || service.name));
          const validity = el('span', null, { class: 'ccm-config-status' });
          const updateValidity = () => { validity.textContent = idPatterns[service.loader] && ((service.enabled && !service.config.id) || (service.config.id && !idPatterns[service.loader].test(service.config.id))) ? t('needs_id') : t('configured'); };
          field(card, t('enable'), service.enabled, v => { service.enabled = v; updateValidity(); }, 'checkbox', 'ccm-enable-' + service.key); card.append(validity); updateValidity();
          const details = el('details', null, { 'data-settings': service.key }); details.append(el('summary', t('settings'))); card.append(details);
          if (['yandex','mailru','google_ga4','google_ads','google_gtm'].includes(service.loader)) field(details, t({ google_ga4: 'measurement_id', google_ads: 'conversion_id', google_gtm: 'container_id' }[service.loader] || 'counter_id'), service.config.id || '', v => { if (v) service.config.id = v; else delete service.config.id; updateValidity(); }, 'text', 'ccm-id-' + service.key);
          for (const [key, fallback] of Object.entries(data.booleanOptions[service.loader] || {})) field(details, t(key), service.config[key] ?? fallback, v => service.config[key] = v, 'checkbox', 'ccm-' + service.key + '-' + key);
          const note = { yandex: 'webvisor_help', google_gtm: 'gtm_help', google_ga4: 'ga_help', google_maps: 'map_help', yandex_maps: 'map_help' }[service.loader];
          if (note) details.append(el('p', t(note), { class: 'ccm-help' }));
          if (!Object.hasOwn(data.catalog, service.key)) { const remove = el('button', t('delete'), { type: 'button' }); remove.onclick = () => { draft.registry.services = draft.registry.services.filter(s => s !== service); changed(); renderServices(); renderTexts(); }; details.append(remove); }
          group.append(card);
        }
        panels.services.append(group);
      }
      const add=el('details',null,{class:'ccm-add-service',id:'ccm-add-counter'});add.append(el('summary',t('add_counter')));
      const adapter=el('select',null,{id:'ccm-counter-adapter','aria-label':t('adapter')});
      for(const [key,meta] of Object.entries(data.catalog))if(idPatterns[key])adapter.append(el('option',textSource(data.managerLanguage,'service.'+key+'.name'),{value:key}));
      add.append(el('label',t('adapter')),adapter);
      const name=field(add,t('name'),'',()=>{},'text','ccm-counter-name');
      const counterId=field(add,t('counter_id'),'',()=>{},'text','ccm-counter-id');
      const button=el('button',t('add_counter'),{type:'button',id:'ccm-counter-add'});add.append(button);panels.services.append(add);
      // Inputs in the add form are provisional, only a validated card changes the draft.
      button.onclick=()=>{
        if(!idPatterns[adapter.value]?.test(counterId.value)||!name.value.trim()||new TextEncoder().encode(name.value.trim()).length>100||/[<>\x00-\x1f]/.test(name.value)||draft.registry.services.length>=32){status.textContent=t('counter_invalid');return;}
        let n=2,key;do{key=adapter.value+'_'+n++;}while(draft.registry.services.some(s=>s.key===key));
        const meta=data.catalog[adapter.value];
        draft.registry.services.push({key,purpose_id:key,loader:adapter.value,category:meta.category,enabled:false,name:name.value.trim(),purpose:data.lexicons.en['service.'+adapter.value+'.description'],config:{id:counterId.value}});
        draft.texts.locales[data.managerLanguage] ||= {};draft.texts.locales[data.managerLanguage]['service.'+key+'.name']=name.value.trim();
        changed();renderServices();renderTexts();status.textContent=t('counter_added');
        const card=panels.services.querySelector('[data-service="'+key+'"]');card.scrollIntoView({block:'center'});
      };
    }
    const editorControls = el('div', null, { class: 'ccm-language-controls' }); panels.texts.append(editorControls);
    const editSelect = el('select', null, { id: 'ccm-edit-language', 'aria-label': t('language') }); editorControls.append(el('label', t('language')), editSelect);
    const textFields = el('div', null, { id: 'ccm-text-fields' }); panels.texts.append(textFields);
    function renderTexts() {
      languages(editSelect, editLanguage, true);textFields.replaceChildren();
      const keys=['notice_html',...['necessary','analytics','marketing','external_content'].flatMap(c=>[c+'_name',c+'_description'])];
      for(const key of keys) {
        const overrides=draft.texts.locales[editLanguage];
        const row=el('div',null,{class:'ccm-text-row','data-text-row':key});
        const service=draft.registry.services.find(s=>key==='service.'+s.key+'.name');
        const label=key==='notice_html'?t('banner')+' — HTML':service?textSource(editLanguage,key)+' — '+t('name'):data.lexicons[editLanguage]?.[key]||data.lexicons.en[key];
        const input=field(row,label,textSource(editLanguage,key),v=>overrides[key]=v,key==='notice_html'?'textarea':'text',key==='notice_html'?'ccm-notice-html':undefined,key==='notice_html'?t('html_help'):undefined);
        input.dataset.textKey=key;textFields.append(row);
      }
      if(window.CodeMirror?.fromTextArea){const cm=window.CodeMirror.fromTextArea(document.getElementById('ccm-notice-html'),{mode:'htmlmixed',lineNumbers:true});cm.on('change',()=>{draft.texts.locales[editLanguage].notice_html=cm.getValue();changed();});}
    }
    editSelect.onchange=()=>{editLanguage=editSelect.value;draft.texts.locales[editLanguage] ||= {};previewLanguage=editLanguage;renderTexts();schedulePreview();};
    aside.append(el('h3', t('preview')));
    const states = el('div', null, { class: 'ccm-preview-states' });
    for (const key of ['banner', 'preferences', 'map']) { const button = el('button', t(key), { type: 'button', 'data-preview-state': key }); button.onclick = () => { previewState = key; schedulePreview(); }; states.append(button); }
    aside.append(states);
    const frame = el('iframe', null, { sandbox: '', title: t('preview'), id: 'ccm-preview-frame' }); aside.append(frame);
    const previewStatus = el('span', '', { id: 'ccm-preview-status', role: 'status' }); aside.append(previewStatus);
    const escape = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function renderPreview(result) {
      const strings = result.strings, services = result.services.filter(s => s.enabled);
      let content = '';
      if (previewState === 'banner') content = `<div class="cookie-warning-2"><div class="cookie-warning-text">${strings.notice_html}</div><div class="cookie-warning-buttons">${Object.entries(result.buttons).filter(([, v]) => v).map(([key]) => `<button class="cookie-btn cookie-btn--${['accept','accept_all'].includes(key)?'primary':'secondary'}" type="button">${escape(strings[key])}</button>`).join('')}</div></div>`;
      if (previewState === 'preferences') {
        const option = (name, description, disabled = false, attrs = '') => `<label class="cookie-option ${attrs ? 'cc-provider' : ''}" ${attrs}><span class="cookie-option__text"><strong>${escape(name)}</strong><small>${escape(description)}</small></span><input type="checkbox" ${disabled ? 'checked disabled' : ''}></label>`;
        content = `<div class="cookie-warning-settings"><h2>${escape(strings.settings_title)}</h2><p>${escape(strings.settings_intro)}</p>` + option(strings.necessary_name, strings.necessary_description, true) + ['analytics', 'marketing', 'external_content'].map(cat => option(strings[cat + '_name'], strings[cat + '_description'])).join('') + `<div class="cookie-warning-settings__buttons"><button type="button" class="cookie-btn cookie-btn--secondary">${escape(strings.back)}</button><button type="button" class="cookie-btn cookie-btn--primary">${escape(strings.save)}</button></div></div>`;
      }
      if (previewState === 'map') content = services.filter(s => s.category === 'external_content').map(s => {
        const provider = strings['service.' + s.key + '.name'] || s.name;
        const replace = str => (str || '').split('{provider}').join(provider);
        return `<div class="cc-map-placeholder" data-preview-map="${escape(s.key)}">${s.config.show_title === false ? '' : '<h3>' + escape(strings.map_title) + '</h3>'}<p>${escape(replace(strings['service.' + s.key + '.map_notice'] || strings.map_notice))}</p><button type="button">${escape(replace(strings.map_load))}</button></div>`;
      }).join('');
      const parsed = new DOMParser().parseFromString(content, 'text/html');
      for (const a of parsed.querySelectorAll('a')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      frame.srcdoc = '<!doctype html><html lang="' + escape(previewLanguage) + '"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><style>' + String(result.publicCss || '').replace(/<\/style/gi, '') + ' .cookie-warning{position:static;box-shadow:none}.cookie-warning .cookie-warning-settings{max-height:none} body{font:14px system-ui;margin:0;background:#edf0f3;color:#182231}main{padding:24px;height:70px;background:#dde4eb}section{background:white;padding:18px}button{padding:9px;margin:4px;border:1px solid #64748b;background:white;border-radius:4px}small{display:block;color:#536171;margin:4px 0}label{display:block;margin:10px 0}.map{padding:12px;border:1px solid #d3dbe4;margin:12px 0}a{color:#245ba0}</style></head><body><main>' + escape(t('site_mock')) + '</main><section class="cookie-warning">' + parsed.body.innerHTML + '</section></body></html>';
      previewStatus.textContent = '';
    }
    function schedulePreview() {
      clearTimeout(previewTimer); const current = ++sequence;
      previewTimer = setTimeout(async () => { try { const result = await api('preview', { draft: JSON.stringify(draft), language: previewLanguage }); if (current === sequence) renderPreview(result); } catch (_) { if (current === sequence) previewStatus.textContent = t('preview_error'); } }, 250);
    }
    save.onclick = async () => {
      if (!Number.isInteger(draft.options.ttl_days) || draft.options.ttl_days < 1 || draft.options.ttl_days > 3650 || !/^[A-Za-z0-9._-]{1,32}$/.test(draft.options.policy_version) || draft.registry.services.some(s => (idPatterns[s.loader] && ((s.enabled && !s.config.id) || (s.config.id && !idPatterns[s.loader].test(s.config.id)))) || (s.purpose_id && !/^[a-z][a-z0-9_.-]{0,63}$/.test(s.purpose_id)))) { status.textContent = t('error'); status.dataset.state = 'error'; return; }
      save.disabled = true; status.textContent = t('saving');
      const snapshot = JSON.stringify(draft);
      try {
        const payload={...draft,log_dir:storedLogDir,log_dir_mode:'absolute'};
        const saved = await api('save', { draft: JSON.stringify(payload), revision }); revision = saved.revision; auditState.textContent = t('audit_' + (saved.auditStatus?.state || 'not_configured'));
        if (JSON.stringify(draft) === snapshot) { draft.options=saved.options;draft.registry=saved.registry;draft.texts=saved.texts;draft.texts.locales[editLanguage] ||= {};dirty=false;savedForm=JSON.stringify({options:draft.options,registry:draft.registry,texts:draft.texts});renderServices();renderTexts(); }
        status.textContent = dirty ? t('unsaved') : t('saved'); status.dataset.state = dirty ? 'dirty' : 'saved'; schedulePreview();
      } catch (e) { status.textContent = e.message; status.dataset.state = 'error'; }
      finally { save.disabled = false; }
    };
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    renderServices(); renderTexts(); schedulePreview();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
