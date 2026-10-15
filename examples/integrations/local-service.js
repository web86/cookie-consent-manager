// Register /assets/js/integrations/local-service.js as a custom_js service in Manager.
// This file is requested only after the assigned category is allowed.
(() => {
  'use strict';
  document.dispatchEvent(new CustomEvent('example:service-ready'));
})();
