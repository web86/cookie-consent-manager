/** MODX 2 CMP: explicit saves, local drafts, server-sanitized isolated previews. */
(() => {
  'use strict';
  const start = async () => {
    const root = document.getElementById('ccm-page'); if (!root) return;
    const boot = window.CookieConsentManagerBootstrap;
    let data, draft, revision, editLanguage, previewLanguage, previewState = 'banner', activeTab = 'main', dirty = false, previewTimer, sequence = 0;
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
        const reason=data?.managerStrings['m.reason_'+diagnostic.reason];
        const receiver=Number.isInteger(diagnostic.receiver_status)&&diagnostic.receiver_status>=0&&diagnostic.receiver_status<=599 ? ', receiver HTTP '+diagnostic.receiver_status : '';
        const receiverCode=['origin_forbidden','invalid_payload','duplicate_event','rate_limited','audit_unavailable','method_not_allowed','unsupported_media_type','payload_too_large'].includes(diagnostic.receiver_code)?', '+diagnostic.receiver_code:'';
        if(reason)throw Error(reason+' ('+action+', connector HTTP '+response.status+receiver+receiverCode+', request_id='+(diagnostic.request_id||code)+')');
        throw fail(code + (diagnostic.reason && /^[a-z_]{1,40}$/.test(diagnostic.reason) ? ':' + diagnostic.reason : ''), diagnostic.request_id);
      }
      return json.object;
    };
    try { data = await api('get'); } catch (e) { root.textContent = e.message; return; }
    const t = key => data.managerStrings['m.' + key] || data.managerStrings[key] || data.lexicons.en['m.' + key] || '…';
    const el = (tag, text, attributes = {}) => { const node = document.createElement(tag); if (text != null) node.textContent = text; for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); return node; };
    const icon = name => {
      const paths = {
        refresh: 'M20 7v5h-5 M4 17v-5h5 M6.1 7a7 7 0 0 1 11.6-2L20 8 M4 16l2.3 3A7 7 0 0 0 18 17',
        book: 'M12 5v15 M12 5C9 3 5 3 3 4v14c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-1-9 1',
        warning: 'M12 8v5 M12 16v.1 M10.3 4.9 2.5 18.4A1.7 1.7 0 0 0 4 21h16a1.7 1.7 0 0 0 1.5-2.6L13.7 4.9a2 2 0 0 0-3.4 0',
        info: 'M12 11v6 M12 7v.1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
      };
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round',class:'ccm-icon','aria-hidden':'true',focusable:'false'})) svg.setAttribute(key, value);
      const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name]); svg.append(path); return svg;
    };
    const note = (text, warning = false) => {
      const card = el('div', null, {class:'ccm-note' + (warning ? ' ccm-note-warning' : '')});
      card.append(icon(warning ? 'warning' : 'info'), text); return card;
    };
    const appendFooter = () => {
      const footer=el('footer',null,{class:'ccm-footer'});
      footer.append(document.createTextNode(t('developer')+' '),el('a','www.web86.site',{href:'https://www.web86.site/',target:'_blank',rel:'noopener noreferrer'}));
      root.append(footer);
    };
    const pageTitle = () => { const title=el('div',null,{class:'ccm-title'}); title.append(el('h2',t('title')),el('small',t('package_version')+' '+(data.packageVersion || '—'),{id:'ccm-package-version'}));return title; };
    if(!data.canManage){
      document.body.classList.add('ccm-manager');root.closest('.x-panel-body')?.classList.add('ccm-scroll-host');
      root.removeAttribute('aria-busy');root.className='ccm-page ccm-page-logs';root.append(pageTitle());
      const panel=el('section',null,{id:'ccm-panel-logs',class:'ccm-panel'});root.append(panel);
      window.CookieConsentAuditViewer.mount(panel,{api,t,el,boot,data}).loadInitial();appendFooter();return;
    }
    const idPatterns = { vk_ads: /^[0-9]{1,20}$/, meta_pixel: /^[0-9]{1,20}$/, yandex: /^[0-9]{1,20}$/, mailru: /^[0-9]{1,20}$/, google_ga4: /^G-[A-Z0-9]{4,20}$/, google_ads: /^AW-[0-9]{4,20}$/, google_gtm: /^GTM-[A-Z0-9]{4,20}$/ };
    const idFormats = { vk_ads: '12345678', meta_pixel: '123456789012345', yandex: '12345678', mailru: '12345678', google_ga4: 'G-XXXXXX', google_ads: 'AW-12345678', google_gtm: 'GTM-XXXXXX' };
    const clone = value => JSON.parse(JSON.stringify(value));
    // MODX modError::toArray turns empty stdClass configs into []; normalize before editing/cloning.
    const editableRegistry = registry => {
      for (const service of registry.services) {
        if (Array.isArray(service.config) && service.config.length === 0 && Object.keys(service.config).length === 0) service.config = {};
        if (!service.config || Object.getPrototypeOf(service.config) !== Object.prototype) throw Error(t('invalid_config') + ' (' + service.key + ')');
      }
      return clone(registry);
    };
    // MODX also turns empty translation dictionaries into []; never edit arrays as maps.
    const editableTexts = texts => {
      if (Array.isArray(texts.locales) && texts.locales.length === 0 && Object.keys(texts.locales).length === 0) texts.locales = {};
      if (!texts.locales || Object.getPrototypeOf(texts.locales) !== Object.prototype) throw Error(t('invalid_texts'));
      for (const [language, values] of Object.entries(texts.locales)) {
        if (Array.isArray(values) && values.length === 0 && Object.keys(values).length === 0) texts.locales[language] = {};
        if (!texts.locales[language] || Object.getPrototypeOf(texts.locales[language]) !== Object.prototype) throw Error(t('invalid_texts') + ' (' + language + ')');
      }
      return clone(texts);
    };
    const conflictingPixelId = service => service.enabled && ['mailru','vk_ads'].includes(service.loader) && service.config.id && draft.registry.services.some(other => other.enabled && other.loader === (service.loader === 'mailru' ? 'vk_ads' : 'mailru') && other.config.id && other.config.id.replace(/^0+(?=\d)/,'') === service.config.id.replace(/^0+(?=\d)/,''));
    const validScriptPath = window.web86ScriptUrl.valid;
    const invalidCustom = service => service.loader === 'custom_js' && (!validScriptPath(service.config.path) || draft.registry.services.some(other => other !== service && other.loader === 'custom_js' && window.web86ScriptUrl.identity(other.config.path) === window.web86ScriptUrl.identity(service.config.path)));
    const existingProvider = service => data.registry.services.some(original => original.key === service.key && original.enabled && original.loader === service.loader && original.config.id?.replace(/^0+(?=\d)/, '') === service.config.id?.replace(/^0+(?=\d)/, ''));
    const duplicateId = service => service.enabled && service.config.id && draft.registry.services.some(other => other !== service && other.enabled && other.loader === service.loader && other.config.id?.replace(/^0+(?=\d)/, '') === service.config.id.replace(/^0+(?=\d)/, '') && (!existingProvider(service) || !existingProvider(other)));
    const invalidId = service => Boolean(idPatterns[service.loader]) && ((service.enabled && !Object.hasOwn(service.config, 'id')) || (Object.hasOwn(service.config, 'id') && (typeof service.config.id !== 'string' || !idPatterns[service.loader].test(service.config.id))));
    try { draft = { options: clone(data.options), registry: editableRegistry(data.registry), texts: editableTexts(data.texts), log_dir: data.log_dir, audit_config_file: data.audit_config_file || '' }; }
    catch (e) { root.removeAttribute('aria-busy'); root.setAttribute('role', 'alert'); root.textContent = e.message; return; }
    revision = data.revision; editLanguage = data.managerLanguage; previewLanguage = editLanguage;
    draft.texts.locales[editLanguage] ||= {};
    document.body.classList.add('ccm-manager');
    const scrollHost = root.closest('.x-panel-body'); if (scrollHost) scrollHost.classList.add('ccm-scroll-host');
    let savedForm=JSON.stringify({options:draft.options,registry:draft.registry,texts:draft.texts});
    root.removeAttribute('aria-busy'); root.className = 'ccm-page';
    const header = el('header'); header.append(pageTitle());
    const save = el('button', t('save'), { type: 'button', id: 'ccm-save', class: 'ccm-primary' });
    const status = el('span', t('unchanged'), { id: 'ccm-status', role: 'status', 'aria-live': 'polite' }); header.append(status, save);
    const layout = el('div', null, { class: 'ccm-layout' }), main = el('div', null, { class: 'ccm-main' }), aside = el('aside', null, { class: 'ccm-preview' });
    root.append(header, layout); layout.append(main, aside);
    const tabs = el('div', null, { class: 'ccm-tabs', role: 'tablist', 'aria-label': t('title') }); main.append(tabs);
    const panels = {};
    for (const key of ['main', 'services', 'texts', 'logs']) {
      const button = el('button', t(key), { type: 'button', role: 'tab', id: 'ccm-tab-' + key, 'aria-controls': 'ccm-panel-' + key, 'aria-selected': String(key === 'main') });
      const panel = el('section', null, { role: 'tabpanel', id: 'ccm-panel-' + key, 'aria-labelledby': button.id, class: 'ccm-panel' }); panel.hidden = key !== 'main'; panels[key] = panel;
      button.onclick = () => { activeTab=key;root.classList.toggle('ccm-page-logs',key==='logs');aside.hidden=key==='logs';layout.classList.toggle('ccm-layout-logs',key==='logs');if(key==='logs')auditViewer.loadInitial();previewLanguage = key === 'texts' ? editLanguage : data.managerLanguage; schedulePreview(); for (const [name, content] of Object.entries(panels)) { content.hidden = name !== key; document.getElementById('ccm-tab-' + name).setAttribute('aria-selected', String(name === key)); } };
      tabs.append(button); main.append(panel);
    }
    function changed() { dirty = true; status.textContent = t('unsaved'); status.dataset.state = 'dirty'; schedulePreview(); }
    function field(container, label, value, callback, type = 'text', id, help, provisional = false) {
      const row = el('label', null, { class: 'ccm-field' }); row.append(el('span', label));
      const input = el(type === 'textarea' ? 'textarea' : 'input', null, { ...(type === 'textarea' ? {} : { type }), ...(id ? { id } : {}) });
      if (type === 'checkbox') input.checked = Boolean(value); else input.value = value ?? '';
      input.addEventListener(type === 'checkbox' ? 'change' : 'input', () => { callback(type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value); if (!provisional) changed(); });
      row.append(input); if (help) row.append(el('small', help)); container.append(row); return input;
    }
    const basics=el('div',null,{class:'ccm-basic-settings'});panels.main.append(basics);
    field(basics, t('ttl_days'), draft.options.ttl_days, v => draft.options.ttl_days = v, 'number', 'ccm-ttl').setAttribute('min', '1');
    document.getElementById('ccm-ttl').setAttribute('max', '3650');

    const buttons = {};
    const legacy = () => { for (const key of ['configure', 'accept_all']) buttons[key].disabled = draft.options.buttons.accept; };
    for (const key of ['reject', 'configure', 'accept_all', 'accept']) buttons[key] = field(basics, t('show_' + key), draft.options.buttons[key], v => { draft.options.buttons[key] = v; legacy(); }, 'checkbox', 'ccm-show-' + key);
    legacy();
    const warningText=el('p');warningText.append(el('strong',t('attention')+' '),document.createTextNode(t('legacy_help')));
    const warning=note(warningText,true);warning.id='ccm-legacy-warning';panels.main.append(warning);
    buttons.accept.setAttribute('aria-describedby',warning.id);
    const actions=el('div',null,{class:'ccm-settings-actions'});panels.main.append(actions);
    const advanced=el('details',null,{id:'ccm-advanced',class:'ccm-advanced'});
    const advancedHeading=el('summary',null,{'aria-expanded':'false','aria-controls':'ccm-advanced-content'});
    advancedHeading.append(el('span',t('advanced')),el('span',null,{class:'ccm-chevron','aria-hidden':'true'}));
    const advancedContent=el('div',null,{id:'ccm-advanced-content',class:'ccm-advanced-content'});
    advanced.append(advancedHeading,advancedContent);panels.main.append(advanced);
    advanced.addEventListener('toggle',()=>advancedHeading.setAttribute('aria-expanded',String(advanced.open)));
    const build=el('section',null,{id:'ccm-adapters-build',class:'ccm-settings-section'});build.append(el('h3',t('adapters_build')));
    const buildRow=el('div',null,{class:'ccm-build-row'}),buildStatus=el('div',null,{class:'ccm-build-status'});
    const buildState=el('p','',{id:'ccm-build-status',role:'status','aria-live':'polite'});
    const buildTime=el('p','',{id:'ccm-build-time'});
    const preservedAdapters=el('p','',{id:'ccm-adapters-preserved',class:'ccm-help'});
    const buildButton=el('button',t('rebuild_adapters'),{type:'button',id:'ccm-bundle-rebuild'});buildButton.prepend(icon('refresh'));
    const showBuild=(failure='')=>{
      const value=data.adapterBuild || {state:'fallback'},state=failure?'error':(['ready','error','fallback'].includes(value.state)?value.state:'fallback');
      buildState.dataset.state=state;buildState.textContent=t('build_'+state)+(failure?' '+failure:'');
      const date=value.built_at ? new Date(value.built_at) : null;
      buildTime.replaceChildren(document.createTextNode(t('build_time')+' '),el('strong',date&&Number.isFinite(date.getTime())?date.toLocaleString(data.managerLanguage):'—'));
      preservedAdapters.hidden=!value.preserved;preservedAdapters.textContent=t('adapters_preserved');
    };
    showBuild();buildStatus.append(buildState,buildTime);buildRow.append(buildButton,buildStatus);
    build.append(buildRow,preservedAdapters,note(el('p',t('build_help'))));
    buildButton.onclick=async()=>{buildButton.disabled=true;buildState.dataset.state='running';buildState.textContent=t('build_running');try{data.adapterBuild=await api('bundle_rebuild');showBuild();}catch(e){showBuild(e.message);}finally{buildButton.disabled=false;}};
    const auditViewer=window.CookieConsentAuditViewer.mount(panels.logs,{api,t,el,boot,data});
    const storage=el('section',null,{id:'ccm-log-storage',class:'ccm-settings-section'});storage.append(el('h3',t('consent_journal')));
    const logMode=el('select',null,{id:'ccm-log-mode','aria-label':t('log_location')});
    for(const mode of ['site','absolute'])logMode.append(el('option',t('log_'+mode),{value:mode}));
    const publicRoot=data.documentRoot;
    draft.log_dir_mode=draft.log_dir&&draft.log_dir.startsWith(publicRoot+'/')?'site':'absolute';
    if(draft.log_dir_mode==='site')draft.log_dir=draft.log_dir.slice(publicRoot.length);
    logMode.value=draft.log_dir_mode;const logModeRow=el('label',null,{class:'ccm-field'});logModeRow.append(el('span',t('log_location')),logMode);storage.append(logModeRow);
    logMode.onchange=()=>{draft.log_dir_mode=logMode.value;changed();};
    const logInput=field(storage,t('log_dir'),draft.log_dir,v=>draft.log_dir=v,'text','ccm-log-dir');
    const logNotes=el('div');logNotes.append(el('p',t('log_save_help')),el('p',t('log_default_help')+' '+data.defaultLogDir),el('p',t('audit_privacy_warning'),{id:'ccm-audit-warning'}));storage.append(note(logNotes));
    logInput.setAttribute('aria-describedby','ccm-log-notes');logNotes.id='ccm-log-notes';
    savedForm=JSON.stringify({options:draft.options,registry:draft.registry,texts:draft.texts,log_dir:draft.log_dir,log_dir_mode:draft.log_dir_mode});
    const reconsent=el('button',t('reconsent'),{type:'button',id:'ccm-reconsent'});reconsent.prepend(icon('refresh'));actions.append(reconsent);
    reconsent.onclick=async()=>{if(dirty){status.textContent=t('save_first');return;}if(!window.confirm(t('reconsent_confirm')))return;
      reconsent.disabled=true;try{const saved=await api('reconsent',{revision});draft.options=saved.options;revision=saved.revision;status.textContent=t('reconsent_success');}catch(e){status.textContent=e.message;status.dataset.state='error';}finally{reconsent.disabled=false;}};
    const guide=data.guide;
    const help=el('button',t('guide_open'),{type:'button',id:'ccm-guide-open'});help.prepend(icon('book'));
    const dialog=el('dialog',null,{id:'ccm-guide-dialog','aria-labelledby':'ccm-guide-title'});
    const close=el('button',guide.close,{type:'button',id:'ccm-guide-close',autofocus:''});
    const heading=el('div',null,{class:'ccm-guide-heading'});heading.append(el('h2',guide.title,{id:'ccm-guide-title'}),close);
    dialog.append(heading,el('p',guide.intro),el('p',guide.warning,{class:'ccm-guide-warning'}));
    for(const section of guide.sections){
      dialog.append(el('h3',section.title));
      for(const block of section.blocks){
        if(block.type==='code'){const pre=el('pre');pre.append(el('code',block.text));dialog.append(pre);}
        else if(block.type==='paragraph')dialog.append(el('p',block.text));
      }
    }
    close.onclick=()=>dialog.close();root.append(dialog);
    help.onclick=()=>dialog.showModal();dialog.addEventListener('close',()=>help.focus());
    // MODX Manager's ExtJS keymap prevents the native Escape default. Keep handling local.
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();}});
    const appearance=el('section',null,{id:'ccm-banner-appearance',class:'ccm-settings-section'});appearance.append(el('h3',t('banner_appearance')));
    const position=el('select',null,{id:'ccm-banner-position'});
    for(const value of ['bottom','bottom-right','bottom-left'])position.append(el('option',t('banner_position_'+value),{value}));
    position.value=draft.options.banner_position || 'bottom';
    const positionRow=el('label',null,{class:'ccm-field'});positionRow.append(el('span',t('banner_position')),position);appearance.append(positionRow);
    position.onchange=()=>{draft.options.banner_position=position.value;changed();};
    actions.append(help);advancedContent.append(appearance,storage,build);appendFooter();


    function textSource(language, key) {
      const base = draft.texts.base_language;
      if(key==='banner_title')return draft.texts.locales[language]?.[key] ?? draft.texts.locales[base]?.[key] ?? '';
      const service = draft.registry.services.find(s => key.startsWith('service.' + s.key + '.'));
      if(key==='map_notice'||key==='map_load'||key.endsWith('.map_notice')) {
        const common=key==='map_load'?'map_load':'map_notice',legacy=common==='map_load'?'embed_settings':'embed_notice';
        return [draft.texts.locales[language]?.[key],draft.texts.locales[language]?.[common],draft.texts.locales[language]?.[legacy],data.lexicons[language]?.[common],draft.texts.locales[base]?.[common],draft.texts.locales[base]?.[legacy],data.lexicons[base]?.[common],data.lexicons.en[common]].find(v=>typeof v==='string'&&v.length>0)||'';
      }
      const serviceFallback = service ? (key.endsWith('.name') ? service.name : service.purpose) : '';
      return draft.texts.locales[language]?.[key] ?? data.lexicons[language]?.[key] ?? draft.texts.locales[base]?.[key] ?? data.lexicons[base]?.[key] ?? data.lexicons.en[key] ?? serviceFallback;
    }
    function languages(select, selected, available = false) {
      select.replaceChildren(); const codes = [...new Set([...(available ? data.availableLanguages : Object.keys(draft.texts.locales)), selected])].sort();
      for (const code of codes) select.append(el('option', code, { value: code })); select.value = selected;
    }
    const settingsExpanded = new Set();
    const groupExpanded = { analytics: true, marketing: true, external_content: true };
    function renderServices() {
      const addButton = el('button',t('add_service'),{type:'button',id:'ccm-add-service',class:'ccm-primary'});
      const intro=el('p',t('category_visibility_help')+' ',{class:'ccm-help ccm-services-intro'}),info=el('button','i',{type:'button',class:'ccm-info','aria-label':t('category_responsibility'),title:t('category_responsibility'),'aria-describedby':'ccm-category-tip'}),tip=el('span',t('category_responsibility'),{id:'ccm-category-tip',role:'tooltip',class:'ccm-tooltip'}),infoWrap=el('span',null,{class:'ccm-info-wrap'});infoWrap.append(info,tip);intro.append(infoWrap);panels.services.replaceChildren(addButton,intro);
      for (const category of ['analytics', 'marketing', 'external_content']) {
        const group = el('section', null, { class: 'ccm-service-group', 'data-group': category });
        const name=data.managerStrings[category + '_name'];
        const heading=el('div',null,{class:'ccm-group-heading'}),title=el('h3',null,{id:'ccm-group-title-'+category});
        const content=el('div',null,{id:'ccm-group-content-'+category,'aria-labelledby':title.id});content.hidden=!groupExpanded[category];
        const toggle=el('button',null,{type:'button',class:'ccm-group-toggle',id:'ccm-group-toggle-'+category,'aria-controls':content.id,'aria-expanded':String(groupExpanded[category]),'aria-label':t(groupExpanded[category]?'collapse':'expand')+' — '+name});
        toggle.append(el('span',null,{class:'ccm-chevron','aria-hidden':'true'}),el('span',name));title.append(toggle);heading.append(title);
        const visible=field(heading,t('category_visible'),draft.options.categories[category],v=>draft.options.categories[category]=v,'checkbox','ccm-category-visible-'+category);
        visible.parentElement.classList.add('ccm-category-visibility');
        toggle.onclick=()=>{groupExpanded[category]=!groupExpanded[category];content.hidden=!groupExpanded[category];toggle.setAttribute('aria-expanded',String(groupExpanded[category]));toggle.setAttribute('aria-label',t(groupExpanded[category]?'collapse':'expand')+' — '+name);};
        const visibilityNote=el('p',t('hidden_services_help'),{class:'ccm-help ccm-category-blocked','data-category-blocked':category});
        const updateVisibilityNote=()=>visibilityNote.hidden=draft.options.categories[category]||!draft.registry.services.some(s=>s.enabled&&s.category===category);
        visible.addEventListener('change',updateVisibilityNote);updateVisibilityNote();group.append(heading,visibilityNote,content);
        for (const service of draft.registry.services.filter(s => s.category === category)) {
          const card = el('article', null, { class: 'ccm-service', 'data-service': service.key });
          const cardHeading=el('div',null,{class:'ccm-service-heading'}),identity=el('div',null,{class:'ccm-service-identity'});
          identity.append(el('h4',textSource(data.managerLanguage,'service.'+service.key+'.name')||service.name));cardHeading.append(identity);card.append(cardHeading);
          const validity = el('span', null, { class: 'ccm-config-status' });
          let idInput, idError, pathInput;
          const updateValidity = () => {
            const conflict = conflictingPixelId(service), invalid = invalidId(service) || conflict || duplicateId(service) || invalidCustom(service); validity.textContent = invalid ? t(invalidCustom(service)?'script_invalid':duplicateId(service)?'service_invalid':'needs_id') : service.enabled ? t('configured') : t('service_disabled');
            validity.dataset.state=invalid?'invalid':service.enabled?'ready':'off';
            if (idInput) { idInput.setAttribute('aria-invalid', String(invalid)); idError.hidden = !invalid; idError.textContent = invalid ? (conflict ? t('pixel_id_conflict') : !service.config.id ? t('id_required') : t('id_invalid').replace('{format}', idFormats[service.loader])) : ''; }
          };
          const enable=field(cardHeading,t('enable'),service.enabled,v=>{service.enabled=v;updateValidity();updateVisibilityNote();},'checkbox','ccm-enable-'+service.key);enable.parentElement.classList.add('ccm-service-enable');identity.append(validity); updateValidity();
          const details = el('details', null, { 'data-settings': service.key }); details.append(el('summary', t('settings'))); details.open=settingsExpanded.has(service.key);details.ontoggle=()=>{if(details.open)settingsExpanded.add(service.key);else settingsExpanded.delete(service.key);};card.append(details);
          field(details,t('name'),textSource(data.managerLanguage,'service.'+service.key+'.name'),v=>{service.name=v;draft.texts.locales[data.managerLanguage] ||= {};draft.texts.locales[data.managerLanguage]['service.'+service.key+'.name']=v;identity.querySelector('h4').textContent=v;},'text','ccm-name-'+service.key);
          if(service.loader==='custom_js')field(details,t('purpose'),service.purpose,v=>service.purpose=v,'textarea','ccm-purpose-text-'+service.key,t('purpose_help'));
          const categorySelect=el('select',null,{id:'ccm-category-'+service.key,'aria-label':t('category')});
          for(const c of ['analytics','marketing','external_content'])categorySelect.append(el('option',data.managerStrings[c+'_name'],{value:c}));
          categorySelect.value=service.category;const categoryRow=el('label',null,{class:'ccm-field'});categoryRow.append(el('span',t('category')),categorySelect);details.append(categoryRow);
          categorySelect.onchange=()=>{service.category=categorySelect.value;groupExpanded[service.category]=true;document.getElementById('ccm-group-content-'+service.category).hidden=false;const toggle=document.getElementById('ccm-group-toggle-'+service.category);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label',t('collapse')+' — '+data.managerStrings[service.category+'_name']);document.getElementById('ccm-group-content-'+service.category).append(card);changed();categorySelect.focus();};
          if(service.loader==='custom_js')pathInput=field(details,t('script_path'),service.config.path,v=>{service.config.path=v;pathInput.setCustomValidity(invalidCustom(service)?t('script_invalid'):'');updateValidity();},'text','ccm-path-'+service.key,t('script_help'));
          const adapterSource = ['google_maps','yandex_maps'].includes(service.loader) ? data.assetsUrl+'components/cookieconsentmanager/js/cookie-consent/embeds.js' : ['youtube','rutube','vk_video'].includes(service.loader) ? data.assetsUrl+'components/cookieconsentmanager/js/cookie-consent/embeds/' + ({youtube:'youtube',rutube:'rutube',vk_video:'vk-video'}[service.loader]) + '.js' : data.assetsUrl+'components/cookieconsentmanager/js/cookie-consent/services/' + ({yandex:'yandex',mailru:'mailru',google_ga4:'google-ga4',google_ads:'google-ads',google_gtm:'google-gtm',vk_ads:'vk-ads',meta_pixel:'meta-pixel',custom_js:'custom-js'}[service.loader] || 'unknown') + '.js';
          const source=el('p',t('adapter_source')+' '+(service.loader==='custom_js'?service.config.path:adapterSource),{class:'ccm-help ccm-adapter-source'});details.append(source);
          if(pathInput)pathInput.addEventListener('input',()=>source.textContent=t('adapter_source')+' '+service.config.path);
          if (idPatterns[service.loader]) {
            idInput = field(details, t({ vk_ads: 'pixel_id', meta_pixel: 'pixel_id', google_ga4: 'measurement_id', google_ads: 'conversion_id', google_gtm: 'container_id' }[service.loader] || 'counter_id'), service.config.id || '', v => { if (v) service.config.id = v; else delete service.config.id; updateValidity(); }, 'text', 'ccm-id-' + service.key);
            idError = el('small', '', { id: 'ccm-id-error-' + service.key, class: 'ccm-field-error', role: 'status' });
            idInput.setAttribute('aria-describedby', idError.id); idInput.parentElement.append(idError); updateValidity();
          }
          if(pathInput){const pathError=el('small','',{id:'ccm-path-error-'+service.key,class:'ccm-field-error',role:'status'});pathInput.setAttribute('aria-describedby',pathError.id);pathInput.parentElement.append(pathError);const pathValidity=()=>{const invalid=invalidCustom(service);pathInput.setAttribute('aria-invalid',String(invalid));pathError.hidden=!invalid;pathError.textContent=invalid?t('script_invalid'):'';};pathInput.addEventListener('input',pathValidity);pathValidity();}
          for (const [key, fallback] of Object.entries(data.booleanOptions[service.loader] || {})) field(details, t(key), service.config[key] ?? fallback, v => service.config[key] = v, 'checkbox', 'ccm-' + service.key + '-' + key);
          const note = { yandex: 'webvisor_help', google_gtm: 'gtm_help', google_ga4: 'ga_help', google_maps: 'map_help', yandex_maps: 'map_help', youtube: 'video_help', rutube: 'video_help', vk_video: 'video_help' }[service.loader];
          if (note) details.append(el('p', t(note), { class: 'ccm-help' }));
          if (service.loader==='custom_js' || !Object.hasOwn(data.catalog, service.key)) { const remove = el('button', t('delete'), { type: 'button' }); remove.onclick = () => { draft.registry.services = draft.registry.services.filter(s => s !== service); changed(); renderServices(); renderTexts(); }; details.append(remove); }
          content.append(card);
        }
        panels.services.append(group);
      }
      const add=el('dialog',null,{id:'ccm-add-service-dialog','aria-labelledby':'ccm-add-service-title'});
      add.append(el('h3',t('add_service'),{id:'ccm-add-service-title'}));
      const adapter=el('select',null,{id:'ccm-service-adapter','aria-label':t('adapter')});
      const ready=el('optgroup',null,{label:t('ready_adapter')});
      for(const [key] of Object.entries(data.catalog))if(!['custom_js','mock_marketing'].includes(key))ready.append(el('option',textSource(data.managerLanguage,'service.'+key+'.name'),{value:key}));
      adapter.append(el('option',t('create_custom_service'),{value:'custom_js'}),ready);
      adapter.value='custom_js';
      add.append(el('label',t('adapter')),adapter);
      const existing=el('p'),go=el('button',t('go_existing'),{type:'button',id:'ccm-service-existing'});add.append(existing,go);
      const name=field(add,t('name'),'',()=>{},'text','ccm-service-name',null,true);
      const purpose=field(add,t('purpose'),'',()=>{},'textarea','ccm-service-purpose',null,true);
      const counterId=field(add,t('counter_id'),'',()=>{},'text','ccm-service-id',null,true);
      const path=field(add,t('script_path'),'',()=>{},'text','ccm-service-path',t('script_help'),true);
      path.placeholder=(data.assetsUrl || '/assets/')+'js/integrations/bitrix24.js';
      const category=el('select',null,{id:'ccm-service-category','aria-label':t('category')});
      for(const c of ['analytics','marketing','external_content'])category.append(el('option',data.managerStrings[c+'_name'],{value:c}));
      const categoryRow=el('label',null,{class:'ccm-field'});categoryRow.append(el('span',t('category')),category);add.append(categoryRow);
      const error=el('p','',{id:'ccm-service-error',role:'alert'});add.append(error);
      const button=el('button',t('create_service'),{type:'button',id:'ccm-service-create',class:'ccm-primary'}),cancel=el('button',t('close'),{type:'button'});add.append(button,cancel);panels.services.append(add);
      const reveal=key=>{const service=draft.registry.services.find(s=>s.key===key);if(!service)return;groupExpanded[service.category]=true;settingsExpanded.add(key);renderServices();const card=panels.services.querySelector('[data-service="'+key+'"]');card.scrollIntoView({block:'center'});card.querySelector('summary').focus();};
      const updateForm=()=>{const loader=adapter.value,stock=draft.registry.services.find(s=>s.loader===loader);existing.textContent=stock?t('existing_service'):'';go.hidden=!stock;go.onclick=()=>{add.close();reveal(stock.key);};name.value=loader==='custom_js'?'':textSource(data.managerLanguage,'service.'+loader+'.name');purpose.value=loader==='custom_js'?'':data.lexicons.en['service.'+loader+'.description']||name.value;counterId.parentElement.hidden=!idPatterns[loader];path.parentElement.hidden=loader!=='custom_js';category.value=data.catalog[loader].recommended_category;error.textContent='';button.textContent=stock?t('create_additional'):t('create_service');};
      adapter.onchange=updateForm;updateForm();
      addButton.onclick=()=>{add.showModal();adapter.focus();};cancel.onclick=()=>add.close();add.addEventListener('close',()=>addButton.focus());
      add.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();add.close();}});
      button.onclick=()=>{
        if(adapter.value==='custom_js'&&!validScriptPath(path.value)){error.textContent=t('script_invalid');path.setAttribute('aria-invalid','true');path.focus();return;}
        path.removeAttribute('aria-invalid');
        const validText=(value,max)=>value.trim()&&new TextEncoder().encode(value.trim()).length<=max&&!/[<>\x00-\x1f\x7f]/.test(value);
        if(!validText(name.value,100)||!validText(purpose.value,500)||draft.registry.services.length>=32||(idPatterns[adapter.value]&&!idPatterns[adapter.value].test(counterId.value))||(adapter.value==='custom_js'&&(!validScriptPath(path.value)||draft.registry.services.some(s=>s.loader==='custom_js'&&window.web86ScriptUrl.identity(s.config.path)===window.web86ScriptUrl.identity(path.value))))||draft.registry.services.some(s=>s.loader===adapter.value&&s.config.id&&s.config.id.replace(/^0+(?=\d)/,'')===counterId.value.replace(/^0+(?=\d)/,''))){error.textContent=t('service_invalid');return;}
        let key=adapter.value,n=2;while(draft.registry.services.some(s=>s.key===key))key=adapter.value+'_'+n++;
        const config=idPatterns[adapter.value]?{id:counterId.value}:adapter.value==='custom_js'?{path:path.value}:{};
        draft.registry.services.push({key,purpose_id:key,loader:adapter.value,category:category.value,enabled:false,name:name.value.trim(),purpose:purpose.value.trim(),config});
        draft.texts.locales[data.managerLanguage] ||= {};draft.texts.locales[data.managerLanguage]['service.'+key+'.name']=name.value.trim();
        add.close();changed();reveal(key);renderTexts();status.textContent=t('service_added');
      };
    }
    const editorControls = el('div', null, { class: 'ccm-language-controls' }); panels.texts.append(editorControls);
    const editSelect = el('select', null, { id: 'ccm-edit-language', 'aria-label': t('language') }); editorControls.append(el('label', t('language')), editSelect);
    const textFields = el('div', null, { id: 'ccm-text-fields' }); panels.texts.append(textFields);
    function renderTexts() {
      languages(editSelect, editLanguage, true);textFields.replaceChildren();
      const keys=['banner_title','notice_html','map_notice','map_load',...draft.registry.services.filter(s=>['google_maps','yandex_maps'].includes(s.loader)).map(s=>'service.'+s.key+'.map_notice'),...['necessary','analytics','marketing','external_content'].flatMap(c=>[c+'_name',c+'_description'])];
      for(const key of keys) {
        const overrides=draft.texts.locales[editLanguage];
        const row=el('div',null,{class:'ccm-text-row','data-text-row':key});
        const service=draft.registry.services.find(s=>key==='service.'+s.key+'.map_notice');
        const label=key==='banner_title'?t('banner_title'):key==='notice_html'?t('banner')+' — HTML':service?textSource(editLanguage,'service.'+service.key+'.name')+' — '+t('map_notice'):['map_notice','map_load'].includes(key)?t(key):data.lexicons[editLanguage]?.[key]||data.lexicons.en[key];
        const input=field(row,label,textSource(editLanguage,key),v=>overrides[key]=v,key==='notice_html'||key.endsWith('map_notice')?'textarea':'text',key==='notice_html'?'ccm-notice-html':undefined,key==='banner_title'?t('banner_title_help'):key==='notice_html'?t('html_help'):undefined);
        input.dataset.textKey=key;textFields.append(row);
      }
      if(window.CodeMirror?.fromTextArea){const cm=window.CodeMirror.fromTextArea(document.getElementById('ccm-notice-html'),{mode:'htmlmixed',lineNumbers:true});cm.on('change',()=>{draft.texts.locales[editLanguage].notice_html=cm.getValue();changed();});}
    }
    editSelect.onchange=()=>{editLanguage=editSelect.value;draft.texts.locales[editLanguage] ||= {};previewLanguage=editLanguage;renderTexts();schedulePreview();};
    aside.append(el('h3', t('preview')));
    const states = el('div', null, { class: 'ccm-preview-states' });
    for (const key of ['banner', 'preferences', 'map']) { const button = el('button', t(key === 'map' ? 'embeds' : key), { type: 'button', 'data-preview-state': key }); button.onclick = () => { previewState = key; schedulePreview(); }; states.append(button); }
    aside.append(states);
    const frame = el('iframe', null, { sandbox: '', title: t('preview'), id: 'ccm-preview-frame' }); aside.append(frame);
    const previewStatus = el('span', '', { id: 'ccm-preview-status', role: 'status' }); aside.append(previewStatus);
    const escape = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function renderPreview(result) {
      const strings = result.strings, services = result.services.filter(s => s.enabled);
      let content = '';
      if (previewState === 'banner') content = `<div class="cookie-warning-2"><div class="cookie-warning-text">${strings.banner_title?.trim() ? `<h2 class="cookie-warning-title">${escape(strings.banner_title)}</h2>` : ''}${strings.notice_html}</div><div class="cookie-warning-buttons">${Object.entries(result.buttons).filter(([, v]) => v).map(([key]) => `<button class="cookie-btn cookie-btn--${['accept','accept_all'].includes(key)?'primary':'secondary'}" type="button">${escape(strings[key])}</button>`).join('')}</div></div>`;
      if (previewState === 'preferences') {
        const option = (name, description, disabled = false, attrs = '') => `<label class="cookie-option ${attrs ? 'cc-provider' : ''}" ${attrs}><span class="cookie-option__text"><strong>${escape(name)}</strong><small>${escape(description)}</small></span><input type="checkbox" ${disabled ? 'checked disabled' : ''}></label>`;
        content = `<div class="cookie-warning-settings"><h2>${escape(strings.settings_title)}</h2><p>${escape(strings.settings_intro)}</p>` + option(strings.necessary_name, strings.necessary_description, true) + ['analytics', 'marketing', 'external_content'].filter(cat => result.visibleCategories[cat]).map(cat => option(strings[cat + '_name'], strings[cat + '_description'])).join('') + `<div class="cookie-warning-settings__buttons"><button type="button" class="cookie-btn cookie-btn--secondary">${escape(strings.back)}</button><button type="button" class="cookie-btn cookie-btn--primary">${escape(strings.save)}</button></div></div>`;
      }
      if (previewState === 'map') content = services.filter(s => ['google_maps','yandex_maps'].includes(s.loader)).map(s => {
        const provider = strings['service.' + s.key + '.name'] || s.name;
        const replace = str => (str || '').split('{provider}').join(provider);
        return `<div class="cc-map-placeholder" data-preview-map="${escape(s.key)}">${s.config.show_title === false ? '' : '<h3>' + escape(strings.map_title) + '</h3>'}<p>${escape(replace(strings['service.' + s.key + '.map_notice'] || strings.map_notice))}</p><button type="button" ${result.visibleCategories[s.category]?'':'hidden disabled'}>${escape(replace(strings.map_load))}</button></div>`;
      }).join('');
      if (previewState === 'map') content += services.filter(s => ['youtube','rutube','vk_video'].includes(s.loader)).map(s => `<div class="cc-embed-placeholder" data-preview-embed="${escape(s.key)}"><h3>${escape(strings['service.' + s.key + '.name'] || s.name)}</h3><p>${escape(strings.map_notice.split('{provider}').join(strings['service.' + s.key + '.name'] || s.name))}</p><button type="button" ${result.visibleCategories[s.category]?'':'hidden disabled'}>${escape(strings.map_load.split('{provider}').join(strings['service.' + s.key + '.name'] || s.name))}</button></div>`).join('');
      const parsed = new DOMParser().parseFromString(content, 'text/html');
      for (const a of parsed.querySelectorAll('a')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      frame.srcdoc = '<!doctype html><html lang="' + escape(previewLanguage) + '"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><style>' + String(result.publicCss || '').replace(/<\/style/gi, '') + ' .cookie-warning{position:static;box-shadow:none}.cookie-warning .cookie-warning-settings{max-height:none} body{font:14px system-ui;margin:0;background:#edf0f3;color:#182231}main{padding:24px;height:70px;background:#dde4eb}section{background:white;padding:18px}button{padding:9px;margin:4px;border:1px solid #64748b;background:white;border-radius:4px}small{display:block;color:#536171;margin:4px 0}label{display:block;margin:10px 0}.map{padding:12px;border:1px solid #d3dbe4;margin:12px 0}a{color:#245ba0}</style></head><body><main>' + escape(t('site_mock')) + '</main><section class="cookie-warning">' + parsed.body.innerHTML + '</section></body></html>';
      previewStatus.textContent = '';
    }
    function schedulePreview() {
      clearTimeout(previewTimer); const current = ++sequence;
      if(activeTab==='logs')return;
      previewTimer = setTimeout(async () => { try { const result = await api('preview', { draft: JSON.stringify(draft), language: previewLanguage }); if (current === sequence) renderPreview(result); } catch (_) { if (current === sequence) previewStatus.textContent = t('preview_error'); } }, 250);
    }
    save.onclick = async () => {
      const invalidService = draft.registry.services.find(s => invalidId(s) || conflictingPixelId(s) || duplicateId(s) || invalidCustom(s));
      if (invalidService) { groupExpanded[invalidService.category]=true;renderServices(); document.getElementById('ccm-tab-services').click(); const input = document.getElementById((invalidService.loader==='custom_js'?'ccm-path-':'ccm-id-') + invalidService.key); input.closest('details').open = true; input.focus(); status.textContent = t(invalidCustom(invalidService)?'script_invalid':duplicateId(invalidService)?'service_invalid':conflictingPixelId(invalidService) ? 'pixel_id_conflict' : 'needs_id'); status.dataset.state = 'error'; return; }
      if (!Number.isInteger(draft.options.ttl_days) || draft.options.ttl_days < 1 || draft.options.ttl_days > 3650 || !/^[A-Za-z0-9._-]{1,32}$/.test(draft.options.policy_version) || draft.registry.services.some(s => s.purpose_id && !/^[a-z][a-z0-9_.-]{0,63}$/.test(s.purpose_id))) { status.textContent = t('error'); status.dataset.state = 'error'; return; }
      save.disabled = true; status.textContent = t('saving');
      const snapshot = JSON.stringify(draft);
      try {
        const payload={...draft};
        const saved = await api('save', { draft: JSON.stringify(payload), revision,site_origin:location.origin }); revision = saved.revision;
        if (JSON.stringify(draft) === snapshot) { draft.registry=editableRegistry(saved.registry);draft.options=saved.options;draft.texts=editableTexts(saved.texts);draft.texts.locales[editLanguage] ||= {};if(!saved.partial){draft.log_dir=saved.log_dir;draft.log_dir_mode=draft.log_dir&&draft.log_dir.startsWith(publicRoot+'/')?'site':'absolute';if(draft.log_dir_mode==='site')draft.log_dir=draft.log_dir.slice(publicRoot.length);logMode.value=draft.log_dir_mode;document.getElementById('ccm-log-dir').value=draft.log_dir;}dirty=Boolean(saved.partial);savedForm=JSON.stringify({options:draft.options,registry:draft.registry,texts:draft.texts,log_dir:draft.log_dir,log_dir_mode:draft.log_dir_mode});renderServices();renderTexts(); }
        if(saved.partial){status.textContent=t('saved_partial')+' '+(data.managerStrings['m.reason_'+saved.journal.reason]||t('log_write_error'));status.dataset.state='partial';}else{status.textContent=dirty?t('unsaved'):t('saved');status.dataset.state=dirty?'dirty':'saved';}schedulePreview();
      } catch (e) { status.textContent = e.message; status.dataset.state = 'error'; }
      finally { save.disabled = false; }
    };
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    renderServices(); renderTexts(); schedulePreview();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
