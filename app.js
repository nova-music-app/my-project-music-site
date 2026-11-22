(() => {
  const FALLBACK_REPO = 'nova-music-app/my-project-music-site';
  const ASSET_NAME = 'Nova-Music-Setup-1.0.4.exe';
  const FALLBACK_VERSION = '1.0.4';
  const CACHE_KEY = 'nova-releases-cache-v4';
  const CACHE_TTL = 10 * 60 * 1000;

  const REPO = (() => {
    const host = location.hostname;
    if (host.endsWith('.github.io')) {
      const user = host.split('.')[0];
      const repo = location.pathname.split('/').filter(Boolean)[0] || `${user}.github.io`;
      if (user) return `${user}/${repo}`;
    }
    return FALLBACK_REPO;
  })();

  const downHref = `https://github.com/${REPO}/releases/latest/download/${ASSET_NAME}`;

  function setDownloadHref(href) {
    for (const id of ['download-btn', 'download-btn-2']) {
      const link = document.getElementById(id);
      if (link) link.href = href;
    }
  }

  setDownloadHref(downHref);

  document.getElementById('year').textContent = String(new Date().getFullYear());

  function setVersion(version) {
    for (const id of ['version-label', 'version-label-2', 'version-label-3']) {
      const el = document.getElementById(id);
      if (el) el.textContent = version;
    }
  }

  function showStats(downloads, version) {
    setVersion(version);
    const strip = document.getElementById('downloads-stat');
    const count = document.getElementById('downloads-count');
    const count2 = document.getElementById('downloads-count-2');
    if (downloads > 0) {
      count.textContent = downloads.toLocaleString('en-US');
      strip.hidden = false;
    }
    if (count2) count2.textContent = downloads > 0 ? downloads.toLocaleString('en-US') : '—';
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || Date.now() - data.at > CACHE_TTL) return null;
      return data;
    } catch {
      return null;
    }
  }

  function writeCache(downloads, version, href) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ downloads, version, href, at: Date.now() }));
    } catch {
      /* storage unavailable — stats refresh next visit */
    }
  }

  const cached = readCache();
  if (cached) {
    if (cached.href) setDownloadHref(cached.href);
    showStats(cached.downloads, cached.version);
  }

  fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((releases) => {
      if (!Array.isArray(releases) || releases.length === 0) return;
      const assets = releases.flatMap((release) => release.assets || []);
      const installers = assets.filter((asset) => asset.name.toLowerCase().endsWith('.exe'));
      const downloads = installers.reduce((sum, asset) => sum + (asset.download_count || 0), 0);
      const latestInstaller = (releases[0].assets || []).find((asset) =>
        asset.name.toLowerCase().endsWith('.exe')
      );
      const href = latestInstaller && latestInstaller.browser_download_url
        ? latestInstaller.browser_download_url
        : downHref;
      const version = (releases[0].tag_name || '').replace(/^v/i, '') || FALLBACK_VERSION;
      setDownloadHref(href);
      showStats(downloads, version);
      writeCache(downloads, version, href);
    })
    .catch(() => {
      /* offline or rate-limited — cached values stay, otherwise counters stay hidden */
    });
})();
