/* Read-only Manager audit UI. Records are rendered exclusively with textContent. */
(() => {
  'use strict';
  const formatMoscow = raw => {
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(raw)) return '—';
    const source = raw.replace(/\.(\d{1,6})Z$/, (_, fraction) => '.' + fraction.padEnd(3,'0').slice(0,3) + 'Z');
    const date = new Date(source);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== raw.slice(0,19)) return '—';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
  };
  window.CookieConsentAuditViewer = {
    formatMoscow,
    mount(container, { api, t, el, boot, data }) {
      if (!data.canViewLogs) { container.append(el('p', t('log_permission'), { id: 'ccm-log-denied' })); return { loadInitial() {} }; }
      const filters = el('form', null, { id: 'ccm-log-filters', class: 'ccm-log-filters' });
      const select = (key, options) => {
        const label = el('label', t('log_' + key)), control = el('select', null, { id: 'ccm-log-' + key });
        for (const [value, text] of options) control.append(el('option', text, { value })); label.append(control); filters.append(label); return control;
      };
      const currentYear = data.currentLogYear;
      const year = select('year', [[currentYear, currentYear], ['all', t('log_all_years')]]);
      const month = select('month', [['all', t('log_all_months')], ...Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), t('log_month_' + (i + 1))])]);
      const actionLabel = type => data.managerStrings['m.log_action_' + type] || t('log_unknown_action');
      const event = select('action', [['all', t('log_all_actions')], ...['accept_all', 'accept', 'reject', 'save_settings', 'analytics_allow', 'analytics_deny', 'marketing_allow', 'marketing_deny', 'external_content_allow', 'external_content_deny', 'provider_allow', 'provider_deny', 'map_allow', 'map_deny'].map(key => [key, actionLabel(key)])]);
      const search = el('input', null, { id: 'ccm-log-search', type: 'search', maxlength: '512' }), searchLabel = el('label', t('log_search')); searchLabel.append(search); filters.append(searchLabel);
      const find = el('button', t('log_find'), { id: 'ccm-log-find', type: 'submit', class: 'ccm-primary' }); filters.append(find);
      const summary = el('div', null, { class: 'ccm-log-summary' }), total = el('span', t('log_found') + ': 0', { id: 'ccm-log-total' });
      const exportButton = el('button', t('log_export'), { id: 'ccm-log-export', type: 'button', disabled: 'disabled' }); summary.append(total, exportButton);
      const feedback = el('p', '', { id: 'ccm-log-feedback', role: 'status', 'aria-live': 'polite' });
      const table = el('table', null, { id: 'ccm-log-table' }), head = el('thead'), header = el('tr'), body = el('tbody');
      for (const name of ['date', 'ip', 'action', 'field_page', 'details']) header.append(el('th', t('log_' + name), { scope: 'col' })); head.append(header); table.append(head, body);
      const pagination = el('div', null, { class: 'ccm-log-pagination' }), previous = el('button', t('log_previous'), { type: 'button', id: 'ccm-log-previous', disabled: 'disabled' }), next = el('button', t('log_next'), { type: 'button', id: 'ccm-log-next', disabled: 'disabled' }), pageLabel = el('span', '', { id: 'ccm-log-page' }); pagination.append(previous, pageLabel, next);
      const dialog = el('dialog', null, { id: 'ccm-log-dialog', 'aria-labelledby': 'ccm-log-detail-title' }), title = el('h3', t('log_details'), { id: 'ccm-log-detail-title' }), details = el('dl'), history = el('button', t('log_history'), { type: 'button', id: 'ccm-log-history' }), close = el('button', t('log_close'), { type: 'button', id: 'ccm-log-close' });
      dialog.append(title, details, history, close); close.onclick = () => dialog.close();
      const tableRegion=el('div',null,{class:'ccm-log-table-region',role:'region',tabindex:'0','aria-label':t('consent_journal')});tableRegion.append(table);
      container.append(filters, summary, feedback, tableRegion, pagination, dialog);
      let applied, cursors = [''], page = 0, nextCursor = null, started = false, busy = false, loaded = false;
      const selected = () => ({ year: year.value, month: month.value, event: event.value, search: search.value });
      const setBusy = value => { busy = value; find.disabled = value; exportButton.disabled = value || !loaded; previous.disabled = value || page === 0; next.disabled = value || !nextCursor; container.setAttribute('aria-busy', String(value)); };
      async function detail(locator) {
        try {
          const { record } = await api('logs_detail', { locator }); details.replaceChildren();
          const add = (key, value) => { details.append(el('dt', t('log_field_' + key)), el('dd', value == null || value === '' ? '—' : String(value))); };
          for (const key of ['server_time', 'event', 'ip', 'user_agent', 'consent_id', 'event_id']) add(key, record[key]);
          const allowed = [], denied = [];
          for (const [key, yes] of Object.entries(record.categories || {})) (yes ? allowed : denied).push(data.managerStrings[key + '_name'] || key);
          add('allowed', allowed.join(', ')); add('denied', denied.join(', '));
          if (record.schema === 2) add('providers', Object.entries(record.providers || {}).map(([key, yes]) => key + ': ' + t(yes ? 'log_allowed' : 'log_denied')).join('\n'));
          for (const key of ['page', 'policy_version', 'stage', 'client_time', 'provider', 'schema']) add(key, record[key]);
          history.onclick = () => { dialog.close(); search.value = record.consent_id; year.value = 'all'; month.value = 'all'; event.value = 'all'; apply(); };
          if (!dialog.open) dialog.showModal();
        } catch (error) { feedback.hidden=false;feedback.textContent = error.message; }
      }
      async function load() {
        if (busy) return; setBusy(true); feedback.hidden=false; feedback.textContent = t('log_loading');
        try {
          const result = await api('logs_list', { ...applied, cursor: cursors[page] });
          loaded=true;nextCursor = result.next; total.textContent = t('log_found') + ': ' + result.total; pageLabel.textContent = t('log_page') + ' ' + (page + 1);
          body.replaceChildren();
          for (const row of result.items) {
            const tr = el('tr'), cell = el('td'), button = el('button', t('log_view'), { type: 'button', class: 'ccm-log-view' }); button.onclick = () => detail(row.locator); cell.append(button);
            tr.append(el('td', formatMoscow(row.server_time)), el('td', row.ip), el('td', actionLabel(row.event)), el('td', row.page || '—', {class:'ccm-log-path'}), cell); body.append(tr);
          }
          if (!result.items.length) { const tr = el('tr'); tr.append(el('td', t('log_empty'), { colspan: '5' })); body.append(tr); }
          const pendingYear = year.value, pendingEvent = event.value;
          year.replaceChildren(); for (const value of [...new Set([currentYear, ...result.years, pendingYear])].filter(v => v !== 'all').sort().reverse()) year.append(el('option', value, { value })); year.append(el('option', t('log_all_years'), { value: 'all' })); year.value = pendingYear;
          event.replaceChildren(el('option', t('log_all_actions'), { value: 'all' }));
          for (const value of [...new Set([...result.actions, ...(pendingEvent === 'all' ? [] : [pendingEvent])])]) event.append(el('option', data.managerStrings['m.log_action_' + value] || t('log_unknown_action') + ': ' + value, { value })); event.value = pendingEvent;
          feedback.textContent='';feedback.hidden=true;
        } catch (error) { loaded=false;body.replaceChildren();total.textContent=t('log_found')+': —';feedback.hidden=false;feedback.textContent = error.message; nextCursor = null; }
        finally { setBusy(false); }
      }
      function apply() { if (busy) return; applied = selected(); cursors = ['']; page = 0; nextCursor = null; load(); }
      filters.onsubmit = e => { e.preventDefault(); apply(); };
      previous.onclick = () => { if (!busy && page > 0) { page--; load(); } };
      next.onclick = () => { if (!busy && nextCursor) { cursors[++page] = nextCursor; load(); } };
      // Native browser download: no fetch/blob copy of the entire CSV in JavaScript memory.
      const downloadFrame = el('iframe', null, { name: 'ccm-log-download', hidden: 'hidden', title: t('log_export') }); container.append(downloadFrame);
      downloadFrame.onload = () => { try { const text = downloadFrame.contentDocument?.body?.textContent; if (text) { const error = JSON.parse(text); if (error.success === false) feedback.textContent = t('log_export_error'); } } catch (_) {} };
      exportButton.onclick = () => {
        if (busy || !applied) return;
        const form = el('form', null, { method: 'post', action: boot.connector, target: 'ccm-log-download', hidden: 'hidden' });
        for (const [key, value] of Object.entries({ action: 'logs_export', HTTP_MODAUTH: boot.auth, ...applied })) form.append(el('input', null, { type: 'hidden', name: key, value }));
        container.append(form); form.submit(); form.remove();
      };
      return { loadInitial() { if (!started) { started = true; apply(); } } };
    }
  };
})();
