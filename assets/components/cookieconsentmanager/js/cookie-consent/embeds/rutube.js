/** RUTUBE's documented t plus unlisted p; no guessed SDK or query options. */
const web86RutubeEmbed = Object.freeze({
  valid(url) {
    const rules = { p: /^[A-Za-z0-9_-]{1,256}$/, t: /^\d{1,7}$/, skinColor: /^[a-fA-F0-9]{6}$/, getPlayOptions: /^[a-z_]+(?:,[a-z_]+)*$/ };
    return url.hostname === 'rutube.ru' && /^\/play\/embed\/[a-f0-9]{32}\/$/.test(url.pathname) &&
      [...url.searchParams].every(([key, value]) => rules[key]?.test(value));
  }
});
