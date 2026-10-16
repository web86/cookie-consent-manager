/** Canonical snippet output contract; generic trusted templates bypass this policy. */
const web86YouTubeEmbed = Object.freeze({
  valid(url) {
    if (url.hostname !== 'www.youtube-nocookie.com' || !/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)) return false;
    const rules = { start: /^\d{1,7}$/, end: /^\d{1,7}$/, autoplay: /^[01]$/, controls: /^[01]$/, loop: /^[01]$/, playsinline: /^[01]$/, playlist: /^[A-Za-z0-9_-]{11}$/ };
    return [...url.searchParams].every(([key, value]) => rules[key]?.test(value)) &&
      (!url.searchParams.has('playlist') || url.searchParams.get('playlist') === url.pathname.split('/').pop()) &&
      (!url.searchParams.has('end') || +url.searchParams.get('end') > +(url.searchParams.get('start') || 0));
  }
});
