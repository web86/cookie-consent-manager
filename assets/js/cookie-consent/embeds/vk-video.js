/** Official share/embed URL only. Hash, if supplied, is retained, never inferred. */
const web86VkVideoEmbed = Object.freeze({
  valid(url) {
    const rules = { oid: /^-?[1-9][0-9]{0,19}$/, id: /^[1-9][0-9]{0,19}$/, hash: /^[a-fA-F0-9]{16,64}$/, hd: /^[0-4]$/, autoplay: /^[01]$/, t: /^(?:\d{1,7}|\d{1,3}h[0-5][0-9]m[0-5][0-9]s)$/ };
    return ['vk.com','vkvideo.ru'].includes(url.hostname) && url.pathname === '/video_ext.php' &&
      url.searchParams.has('oid') && url.searchParams.has('id') && [...url.searchParams].every(([key, value]) => rules[key]?.test(value));
  }
});
