/** PHP-rendered messages for dynamically created UI only. */
(() => {
  'use strict';
  const message = (key, values = {}) => {
    const node = document.querySelector('[data-cc-message="' + key + '"]');
    let text = node?.textContent || key;
    for (const [name, value] of Object.entries(values)) text = text.split('{' + name + '}').join(String(value));
    return text;
  };
  window.web86Runtime = Object.freeze({ message });
})();
