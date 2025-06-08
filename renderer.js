const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const addFeedBtn = document.getElementById('addFeed');
const feedsDiv = document.getElementById('feeds');
const filterInput = document.getElementById('feedFilter');
const feedDropdown = document.getElementById('feedDropdown');
const articlesDiv = document.getElementById('articles');
const favoritesBtn = document.getElementById('favoritesBtn');
const offlineBtn = document.getElementById("offlineBtn");
const favFeedsBtn = document.getElementById('favFeedsBtn');
const searchInput = document.getElementById('searchInput');
const rangeSelect = document.getElementById('rangeSelect');
const sinceDate = document.getElementById('sinceDate');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const readerBar = document.getElementById('readerBar');
const toggleReader = document.getElementById('toggleReader');
const webModeBtn = document.getElementById('webMode');
const fontSelect = document.getElementById('fontSelect');
const bgColor = document.getElementById('bgColor');
const allFeedsBtn = document.getElementById('allFeeds');
const refreshAllBtn = document.getElementById('refreshAll');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsContent = document.getElementById('settingsContent');
const dialogModal = document.getElementById('dialogModal');
const dialogContent = document.getElementById('dialogContent');
const podcastLibBtn = document.getElementById('podcastLib');
const newsLibBtn = document.getElementById('newsLib');
const addPodcastBtn = document.getElementById('addPodcast');
const podcastFeedsDiv = document.getElementById('podcastFeeds');
const episodesDiv = document.getElementById('episodes');
const newsSearch = document.getElementById('newsSearch');
const newsLibraryDiv = document.getElementById('newsLibrary');
const audioModal = document.getElementById('audioModal');
const audioContent = document.getElementById('audioContent');
const exploreBtn = document.getElementById('exploreBtn');
const rssControls = document.getElementById('rssControls');
const podcastControls = document.getElementById('podcastControls');
allFeedsBtn.dataset.feed = '*';
favoritesBtn.dataset.feed = 'favorites';
favFeedsBtn.dataset.feed = 'favfeeds';
offlineBtn.dataset.feed = "offline";
readerBar.onclick = (e) => e.stopPropagation();

let state = {
  feeds: [],
  articles: {},
  feedWeights: {},
  favorites: [],
  favoriteFeeds: [],
  prefs: {},
  podcasts: [],
  episodes: {},
  offline: [],
  read: {}
};
let filterText = '';
let readerMode = false;
let webViewMode = false;
let searchText = '';
let rangeDays = 7;
let currentFeed = '*';
let currentArticles = [];
let podcastMode = false;
let currentPodcast = null;
let currentEpisodes = [];
let newsMode = false;

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.api.saveData(state);
    saveTimer = null;
  }, 500);
}

function setActiveFeedButton(id) {
  document.querySelectorAll('#feeds button, #allFeeds').forEach(b => {
    b.classList.toggle('active', b.dataset.feed === id || (id === '*' && b.id === 'allFeeds'));
  });
  if (feedDropdown) feedDropdown.value = id;
}

function applyTheme() {
  document.body.dataset.theme = state.prefs.theme || 'system';
}

function applyLayout() {
  document.body.dataset.layout = state.prefs.layout || 'sidebar';
}

function showPodcastMode(on) {
  podcastMode = on;
  rssControls.style.display = on ? 'none' : '';
  podcastControls.style.display = on ? '' : 'none';
  articlesDiv.style.display = on ? 'none' : '';
  episodesDiv.style.display = on ? '' : 'none';
  podcastLibBtn.textContent = on ? 'Back to RSS' : 'Podcasts';
}

function showNewsMode(on) {
  newsMode = on;
  rssControls.style.display = on ? 'none' : '';
  podcastControls.style.display = 'none';
  articlesDiv.style.display = on ? 'none' : '';
  episodesDiv.style.display = 'none';
  newsSearch.style.display = on ? '' : 'none';
  newsLibraryDiv.style.display = on ? '' : 'none';
  podcastLibBtn.style.display = on ? 'none' : '';
  newsLibBtn.textContent = on ? 'Back to RSS' : 'News Library';
}

function renderSpinner(el) {
  el.innerHTML = '<div class="spinner"></div>';
}

function clearSpinner(el) {
  const sp = el.querySelector('.spinner');
  if (sp) sp.remove();
}

function renderError(el, msg) {
  el.innerHTML = `<div class="error">${msg}</div>`;
}

function normalizeFeeds(feeds) {
  return feeds.map(f => (typeof f === 'string' ? { url: f, title: '' } : f));
}

function renderFeeds() {
  feedsDiv.innerHTML = '';
  const frag = document.createDocumentFragment();
  const feeds = state.feeds
    .slice()
    .sort((a, b) => (state.feedWeights[b.url] || 0) - (state.feedWeights[a.url] || 0))
    .filter(f => {
      const url = f.url || f;
      const title = f.title || url;
      return title.toLowerCase().includes(filterText) || url.toLowerCase().includes(filterText);
    });
  feeds.forEach(feed => {
    const url = feed.url || feed;
    const title = feed.title || url;
    const row = document.createElement('div');
    row.className = 'feed-row';
    const star = document.createElement('button');
    star.className = 'fav-feed feed-btn btn';
    star.textContent = state.favoriteFeeds.includes(url) ? '★' : '☆';
    star.onclick = (e) => {
      e.stopPropagation();
      toggleFeedFavorite(url, star);
    };
    const btn = document.createElement('button');
    btn.className = 'feed-btn btn';
    btn.textContent = title;
    btn.dataset.feed = url;
    btn.onclick = () => loadArticles(url);
    const edit = document.createElement('button');
    edit.textContent = '✎';
    edit.className = 'edit-feed feed-btn btn';
    edit.onclick = async (e) => {
      e.stopPropagation();
      const val = await showPrompt('Feed Name', '', title);
      if (val) {
        feed.title = val;
        scheduleSave();
        renderFeeds();
      }
    };
    const del = document.createElement('button');
    del.textContent = '✖';
    del.className = 'del-feed feed-btn btn';
    del.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Remove feed?')) {
        state.feeds = state.feeds.filter(f => (f.url || f) !== url);
        delete state.articles[url];
        scheduleSave();
        renderFeeds();
      }
    };
    row.appendChild(star);
    row.appendChild(btn);
    row.appendChild(edit);
    row.appendChild(del);
    frag.appendChild(row);
  });
  feedsDiv.appendChild(frag);
  if (feedDropdown) {
    feedDropdown.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '*';
    allOpt.textContent = 'All Recent';
    feedDropdown.appendChild(allOpt);
    state.feeds.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.url;
      opt.textContent = f.title || f.url;
      feedDropdown.appendChild(opt);
    });
  }
  renderNewsLibrary();
}

function renderPodcasts() {
  podcastFeedsDiv.innerHTML = '';
  state.podcasts.forEach(p => {
    const row = document.createElement('div');
    row.className = 'feed-row';
    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.loading = 'lazy';
      img.style.width = '24px';
      img.style.height = '24px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      row.appendChild(img);
    }
    const btn = document.createElement('button');
    btn.className = 'feed-btn btn';
    btn.textContent = p.title || p.url;
    btn.onclick = () => loadEpisodes(p.url);
    const imgBtn = document.createElement('button');
    imgBtn.textContent = '✎';
    imgBtn.className = 'img-btn feed-btn btn';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    imgBtn.onclick = (e) => { e.stopPropagation(); input.click(); };
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        p.image = reader.result;
        scheduleSave();
        renderPodcasts();
      };
      reader.readAsDataURL(file);
    };
    const artBtn = document.createElement('button');
    artBtn.textContent = 'Add';
    artBtn.className = 'img-btn feed-btn btn';
    const artInput = document.createElement('input');
    artInput.type = 'file';
    artInput.accept = '.png,.jpg,.jpeg';
    artInput.style.display = 'none';
    artBtn.onclick = (e) => { e.stopPropagation(); artInput.click(); };
    artInput.onchange = () => {
      const file = artInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (state.episodes[p.url]) {
          state.episodes[p.url].forEach(ep => { ep.image = dataUrl; });
        }
        scheduleSave();
        if (currentPodcast === p.url) renderEpisodes(filterArticles(state.episodes[p.url] || []));
      };
      reader.readAsDataURL(file);
    };
    const del = document.createElement('button');
    del.textContent = '✖';
    del.className = 'del-feed feed-btn btn';
    del.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Remove podcast?')) {
        state.podcasts = state.podcasts.filter(f => f.url !== p.url);
        delete state.episodes[p.url];
        scheduleSave();
        renderPodcasts();
      }
    };
    row.appendChild(btn);
    row.appendChild(imgBtn);
    row.appendChild(input);
    row.appendChild(artBtn);
    row.appendChild(artInput);
    row.appendChild(del);
    podcastFeedsDiv.appendChild(row);
  });
}

function renderNewsLibrary() {
  newsLibraryDiv.innerHTML = '';
  const text = (newsSearch.value || '').toLowerCase();
  state.feeds.forEach(feed => {
    const title = feed.title || feed.url;
    if (!title.toLowerCase().includes(text)) return;
    const tile = document.createElement('div');
    tile.className = 'feed-tile';
    tile.onclick = () => {
      showNewsMode(false);
      loadArticles(feed.url);
    };
    if (feed.image) {
      const img = document.createElement('img');
      img.src = feed.image;
      img.loading = 'lazy';
      tile.appendChild(img);
    } else {
      const def = document.createElement('div');
      def.className = 'feed-default';
      def.style.background = colorFor(title);
      def.textContent = title[0].toUpperCase();
      tile.appendChild(def);
    }
    const imgBtn = document.createElement('button');
    imgBtn.textContent = '✎';
    imgBtn.className = 'img-btn feed-btn btn';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    imgBtn.onclick = (e) => { e.stopPropagation(); input.click(); };
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        feed.image = reader.result;
        scheduleSave();
        renderNewsLibrary();
      };
      reader.readAsDataURL(file);
    };
    tile.appendChild(imgBtn);
    tile.appendChild(input);
    const label = document.createElement('div');
    label.textContent = title;
    tile.appendChild(label);
    newsLibraryDiv.appendChild(tile);
  });
}

function renderEpisodes(list) {
  episodesDiv.innerHTML = '';
  list.forEach(ep => {
    const div = document.createElement('div');
    div.className = 'article';
    if (ep.image) {
      const img = document.createElement('img');
      img.src = ep.image;
      img.loading = 'lazy';
      div.appendChild(img);
    }
    const title = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = ep.title;
    title.appendChild(strong);
    div.appendChild(title);
    if (ep.transcript) {
      const t = document.createElement('div');
      t.className = 'summary';
      t.textContent = ep.transcript.slice(0, 200);
      div.appendChild(t);
    }
    const btns = document.createElement('div');
    btns.className = 'article-buttons';
    const play = document.createElement('button');
    play.className = 'article-btn btn';
    play.textContent = 'Play';
    play.onclick = (e) => { e.stopPropagation(); playEpisode(ep); };
    const dl = document.createElement('button');
    dl.className = 'article-btn btn';
    dl.textContent = 'Download';
    dl.onclick = (e) => { e.stopPropagation(); downloadEpisode(ep); };
    btns.appendChild(play);
    btns.appendChild(dl);
    div.appendChild(btns);
    episodesDiv.appendChild(div);
  });
}

function filterArticles(list) {
  const start = rangeDays > 0
    ? Date.now() - rangeDays * 86400000
    : new Date(sinceDate.value).getTime();
  return list.filter(a => {
    const text = (
      a.title + ' ' +
      (a.summary || '') + ' ' +
      (a.content || '') + ' ' +
      (a.transcript || '')
    ).toLowerCase();
    const date = new Date(a.isoDate || a.pubDate || 0).getTime();
    return text.includes(searchText) && (!start || date >= start);
  });
}

function updateArticleDisplay() {
  if (podcastMode) {
    renderEpisodes(filterArticles(currentEpisodes));
  } else if (currentFeed === 'offline') {
    renderOffline(currentArticles);
  } else {
    renderArticles(filterArticles(currentArticles));
  }
}

function renderArticles(articles) {
  articlesDiv.innerHTML = '';
  if (!articles.length) {
    articlesDiv.textContent = 'No articles found';
    return;
  }
  const frag = document.createDocumentFragment();
  articles.forEach(a => {
    const div = document.createElement('div');
    div.className = 'article';
    if (state.read[a.link]) div.classList.add('read');
    if (a.image) {
      const img = document.createElement('img');
      img.src = a.image;
      img.loading = 'lazy';
      div.appendChild(img);
    }
    const title = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = a.title;
    title.appendChild(strong);
    div.appendChild(title);
    if (a.feedTitle) {
      const source = document.createElement('div');
      source.className = 'feed-label';
      source.textContent = a.feedTitle;
      div.appendChild(source);
    }
    if (a.summary) {
      const summary = document.createElement('div');
      summary.className = 'summary';
      summary.textContent = a.summary;
      div.appendChild(summary);
    }
    const btns = document.createElement('div');
    btns.className = 'article-buttons';
    const starBtn = document.createElement('button');
    starBtn.className = 'star-btn article-btn btn';
    starBtn.textContent = isFavorite(a.link) ? '★' : '☆';
    starBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(a, starBtn); };
    const readBtn = document.createElement('button');
    readBtn.className = 'article-btn btn';
    readBtn.textContent = 'Read';
    readBtn.onclick = (e) => { e.stopPropagation(); showArticle(a); };
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'article-btn btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = (e) => { e.stopPropagation(); downloadArticle(a); };
    const openBtn = document.createElement('button');
    openBtn.className = 'article-btn btn';
    openBtn.textContent = 'Open';
    openBtn.onclick = (e) => { e.stopPropagation(); window.api.openLink(a.link); };
    btns.appendChild(starBtn);
    btns.appendChild(readBtn);
    btns.appendChild(downloadBtn);
    btns.appendChild(openBtn);
    div.appendChild(btns);
    frag.appendChild(div);
  });
  articlesDiv.appendChild(frag);
}

function renderOffline(list) {
  articlesDiv.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(item => {
    const div = document.createElement('div');
    div.className = 'article';
    const title = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = item.title;
    title.appendChild(strong);
    div.appendChild(title);
    const btns = document.createElement('div');
    btns.className = 'article-buttons';
    const open = document.createElement('button');
    open.className = 'article-btn btn';
    open.textContent = item.type === 'episode' ? 'Play' : 'Open';
    open.onclick = (e) => {
      e.stopPropagation();
      showOfflineItem(item);
    };
    btns.appendChild(open);
    div.appendChild(btns);
    frag.appendChild(div);
  });
  articlesDiv.appendChild(frag);
}

async function showArticle(a) {
  let raw = a.content;
  if (!raw) {
    try {
      const res = await fetch(a.link);
      raw = await res.text();
    } catch {
      raw = null;
    }
  }
  let parsed = null;
  try {
    parsed = await window.api.parseReader(a.link);
  } catch {}
  if (!raw && !parsed) {
    try {
      const alt = await fetch(`https://r.jina.ai/${a.link}`);
      parsed = await alt.text();
    } catch {}
  }
  if (!raw && !parsed) {
    raw = `<p><a href="${a.link}" target="_blank">Open Link</a></p>`;
  }
  const content = parsed || raw;
  const imgPart = a.image
    ? `<img src="${a.image}" loading="lazy" style="max-width:100%;max-height:400px;margin-bottom:8px;"/>`
    : '';
  modalContent.innerHTML =
    `<h2>${sanitize(a.title)}</h2>` +
    imgPart +
    `<div class="reader" data-raw="" data-link="${a.link}"></div>` +
    `<div id="webContainer" style="display:none;width:100%;height:80vh;">
       <webview src="" style="width:100%;height:100%;border:0"></webview>
     </div>`;
  const readerDiv = modalContent.querySelector('.reader');
  readerDiv.dataset.raw = content;
  readerDiv.innerHTML = content;
  applyReaderPrefs();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };
  modalContent.onclick = (e) => e.stopPropagation();
  readerMode = !!parsed;
  webViewMode = false;
  const webview = modalContent.querySelector('#webContainer webview');
  webview.src = a.link;
  modalContent.querySelector('#webContainer').style.display = 'none';
  state.read[a.link] = true;
  scheduleSave();
}

function showOfflineItem(item) {
  if (item.type === 'episode') {
    playEpisode({
      title: item.title,
      audio: 'file://' + item.file,
      image: item.image || ''
    });
    return;
  }
  modalContent.innerHTML =
    `<iframe src="file://${item.file}" style="width:100%;height:80vh;border:0"></iframe>`;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };
  modalContent.onclick = (e) => e.stopPropagation();
}

function textColorFor(hex) {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000' : '#fff';
}

function colorFor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h},70%,60%)`;
}

function sanitize(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showPrompt(label, placeholder = '', value = '') {
  return new Promise((res) => {
    dialogContent.innerHTML = `<div><div style="margin-bottom:8px;">${label}</div>` +
      `<input id="promptInput" style="width:100%;margin-bottom:8px;" placeholder="${placeholder}"/>` +
      `<div style="display:flex;gap:6px;">` +
      `<button id="promptOk">OK</button><button id="promptCancel">Cancel</button>` +
      `</div></div>`;
    dialogModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('promptInput');
    input.value = value;
    const close = (val) => {
      dialogModal.style.display = 'none';
      document.body.style.overflow = '';
      res(val);
    };
    dialogModal.onclick = () => close(null);
    dialogContent.onclick = (e) => e.stopPropagation();
    document.getElementById('promptOk').onclick = () => close(input.value.trim());
    document.getElementById('promptCancel').onclick = () => close(null);
    input.focus();
  });
}

function showFeedSearch() {
  return new Promise((res) => {
    dialogContent.innerHTML = `<div>` +
      `<input id="feedSearchTerm" style="width:100%;margin-bottom:8px;" placeholder="Search feeds"/>` +
      `<div id="feedResults" style="max-height:300px;overflow:auto;margin-bottom:8px;"></div>` +
      `<div style="display:flex;gap:6px;justify-content:flex-end;">` +
      `<button id="closeExplore">Close</button>` +
      `</div></div>`;
    dialogModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const termInput = document.getElementById('feedSearchTerm');
    const resultsDiv = document.getElementById('feedResults');
    const close = () => {
      dialogModal.style.display = 'none';
      document.body.style.overflow = '';
      res();
    };
    document.getElementById('closeExplore').onclick = close;
    dialogModal.onclick = close;
    dialogContent.onclick = (e) => e.stopPropagation();
    termInput.onkeypress = async (e) => {
      if (e.key === 'Enter') {
        resultsDiv.textContent = 'Searching...';
        const list = await window.api.searchFeeds(termInput.value);
        resultsDiv.innerHTML = '';
        list.forEach(item => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.marginBottom = '4px';
          const title = document.createElement('span');
          title.textContent = item.title;
          const add = document.createElement('button');
          add.className = 'btn';
          add.textContent = 'Add';
          add.onclick = async () => {
            const res = await window.api.fetchFeed(item.url);
            if (res.error) {
              alert('Failed to add feed: ' + res.error);
              return;
            }
            state.feeds.push({ url: item.url, title: res.feedTitle || item.title, image: res.image });
            state.articles[item.url] = res.items;
            scheduleSave();
            renderFeeds();
            add.textContent = 'Added';
          };
          row.appendChild(title);
          row.appendChild(add);
          resultsDiv.appendChild(row);
        });
      }
    };
    termInput.focus();
  });
}

function isBluesky(url) {
  return /^@/.test(url) || /bsky\.(app|social)/i.test(url);
}

function bskyHandle(input) {
  let h = input.replace(/^bsky:\/\//i, '');
  h = h.replace(/^https?:\/\/(www\.)?bsky\.app\/profile\//i, '').replace(/\/.*$/, '');
  if (h.startsWith('@')) h = h.slice(1);
  return h;
}

function applyReaderPrefs() {
  modalContent.style.fontFamily = state.prefs.font || 'sans-serif';
  modalContent.style.fontSize = (state.prefs.textSize || 18) + 'px';
  const bg = state.prefs.bg || '#fff';
  modalContent.style.background = bg;
  modalContent.style.color = textColorFor(bg);
  fontSelect.value = state.prefs.font || 'sans-serif';
  bgColor.value = bg;
}

toggleReader.onclick = async () => {
  readerMode = !readerMode;
  const readerDiv = modalContent.querySelector('.reader');
  if (readerMode && readerDiv && readerDiv.dataset.raw) {
    const parsed = await window.api.parseReader(readerDiv.dataset.link);
    readerDiv.innerHTML = parsed;
  } else if (readerDiv) {
    readerDiv.innerHTML = readerDiv.dataset.raw;
  }
};

webModeBtn.onclick = () => {
  webViewMode = !webViewMode;
  const readerDiv = modalContent.querySelector('.reader');
  const webDiv = modalContent.querySelector('#webContainer');
  if (webViewMode) {
    webDiv.style.display = 'block';
    readerDiv.style.display = 'none';
  } else {
    webDiv.style.display = 'none';
    readerDiv.style.display = 'block';
  }
};

async function downloadArticle(a) {
  const file = await window.api.downloadArticle({ url: a.link, title: a.title });
  state.offline.push({
    title: a.title,
    link: a.link,
    file,
    type: 'article'
  });
  scheduleSave();
  alert(`Saved to ${file}`);
}

async function downloadEpisode(ep) {
  const file = await window.api.downloadEpisode({ url: ep.audio, title: ep.title });
  state.offline.push({
    title: ep.title,
    audio: ep.audio,
    file,
    type: 'episode'
  });
  scheduleSave();
  alert(`Saved to ${file}`);
}

let audioPlayer = null;
function playEpisode(ep) {
  if (audioPlayer) audioPlayer.pause();
  showAudioPlayer(ep);
}

function isFavorite(link) {
  return state.favorites.some(f => f.link === link);
}

async function toggleFavorite(a, btn) {
  if (isFavorite(a.link)) {
    state.favorites = state.favorites.filter(f => f.link !== a.link);
    btn.textContent = '☆';
  } else {
    const file = await window.api.downloadArticle({ url: a.link, title: a.title });
    state.favorites.push({ ...a, offline: file });
    btn.textContent = '★';
  }
  scheduleSave();
}

function isFavoriteFeed(url) {
  return state.favoriteFeeds.includes(url);
}

function toggleFeedFavorite(url, btn) {
  if (isFavoriteFeed(url)) {
    state.favoriteFeeds = state.favoriteFeeds.filter(f => f !== url);
    btn.textContent = '☆';
  } else {
    state.favoriteFeeds.push(url);
    btn.textContent = '★';
  }
  scheduleSave();
}

function showAudioPlayer(ep) {
  audioContent.innerHTML = '';
  if (ep.image) {
    const img = document.createElement('img');
    img.src = ep.image;
    audioContent.appendChild(img);
  }
  const title = document.createElement('h3');
  title.textContent = ep.title;
  audioContent.appendChild(title);
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = ep.audio;
  audio.autoplay = true;
  audioContent.appendChild(audio);
  const idx = currentEpisodes.indexOf(ep);
  const nav = document.createElement('div');
  nav.className = 'player-nav';
  const prev = document.createElement('button');
  prev.className = 'btn';
  prev.textContent = '◀';
  prev.disabled = idx <= 0;
  prev.onclick = (e) => { e.stopPropagation(); if (idx > 0) playEpisode(currentEpisodes[idx - 1]); };
  const next = document.createElement('button');
  next.className = 'btn';
  next.textContent = '▶';
  next.disabled = idx >= currentEpisodes.length - 1;
  next.onclick = (e) => { e.stopPropagation(); if (idx < currentEpisodes.length - 1) playEpisode(currentEpisodes[idx + 1]); };
  nav.appendChild(prev);
  nav.appendChild(next);
  audioContent.appendChild(nav);
  if (ep.transcript) {
    const tr = document.createElement('pre');
    tr.className = 'transcript';
    tr.textContent = ep.transcript;
    audioContent.appendChild(tr);
  }
  audioModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  audioModal.onclick = () => {
    audioModal.style.display = 'none';
    document.body.style.overflow = '';
    audio.pause();
  };
  audioContent.onclick = (e) => e.stopPropagation();
  audioPlayer = audio;
}
const ogCache = {};

function parseXML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const feedTitle = doc.querySelector('channel>title')?.textContent || '';
  const image = doc.querySelector('channel>image>url')?.textContent || '';
  const items = Array.from(doc.querySelectorAll('item')).map(it => ({
    title: it.querySelector('title')?.textContent || '',
    link: it.querySelector('link')?.textContent || '',
    summary: it.querySelector('description')?.textContent || '',
    isoDate: it.querySelector('pubDate')?.textContent || '',
    content: it.querySelector('content\\:encoded')?.textContent || '',
    image: it.querySelector('enclosure')?.getAttribute('url') || ''
  }));
  return { feedTitle, items, image };
}

async function fetchOgImage(url) {
  if (ogCache[url]) return ogCache[url];
  ogCache[url] = (async () => {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const m = html.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"]/i);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  })();
  return ogCache[url];
}

let feedCtrl = null;

function fetchAny(url, controller) {
  let ctrl = controller;
  if (!ctrl) {
    if (feedCtrl) feedCtrl.abort();
    feedCtrl = new AbortController();
    ctrl = feedCtrl;
  }
  if (url.startsWith('bsky:')) {
    return window.api.fetchBluesky(url.slice(5));
  }
  return fetch(url, { signal: ctrl.signal }).then(res => {
    if (!res.ok) throw new Error(res.statusText);
    return res.text();
  }).then(parseXML);
}

async function prefetchAll() {
  articlesDiv.innerHTML = '<div class="spinner"></div>';
  currentFeed = '*';
  currentArticles = [];
  setActiveFeedButton('*');
  const timeline = [];
  const perFeed = {};
  const seen = new Set();
  const tasks = state.feeds.map(feed => {
    const url = feed.url || feed;
    const ctrl = new AbortController();
    return fetchAny(url, ctrl)
      .then(res => {
        if (res.error) return;
        if (res.feedTitle && !feed.title) feed.title = res.feedTitle;
        perFeed[url] = res.items;
        res.items.forEach(item => {
          if (res.feedTitle) item.feedTitle = res.feedTitle;
          const id = item.guid || item.link;
          if (!seen.has(id)) {
            seen.add(id);
            timeline.push(item);
          }
        });
        timeline.sort((a, b) => new Date(b.isoDate || b.pubDate || 0) - new Date(a.isoDate || a.pubDate || 0));
        state.articles[url] = res.items;
        state.articles['*'] = timeline;
        currentArticles = timeline;
        updateArticleDisplay();
      })
      .catch(() => {});
  });
  await Promise.allSettled(tasks);
  renderFeeds();
  scheduleSave();
}

async function loadArticles(url) {
  renderSpinner(articlesDiv);
  state.feedWeights[url] = (state.feedWeights[url] || 0) + 1;
  let items = state.articles[url];
  try {
    if (!items || !items.length) {
      const result = await fetchAny(url);
      if (result.error) throw new Error(result.error);
      items = result.items.slice(0, 50);
      if (result.feedTitle) {
        items.forEach(it => { it.feedTitle = result.feedTitle; });
      }
      await Promise.all(items.slice(0, 10).map(async itm => {
        if (!itm.image) itm.image = await fetchOgImage(itm.link);
      }));
      state.articles[url] = items;
      const feed = state.feeds.find(f => (f.url || f) === url);
      if (feed) {
        if (result.feedTitle) feed.title = result.feedTitle;
        if (result.image) feed.image = result.image;
        renderFeeds();
      }
      scheduleSave();
    }
    currentFeed = url;
    currentArticles = items;
    updateArticleDisplay();
    setActiveFeedButton(url);
  } catch (e) {
    console.error('loadArticles', e);
    renderError(articlesDiv, 'Failed to load feed');
  } finally {
    clearSpinner(articlesDiv);
  }
}

async function loadEpisodes(url) {
  episodesDiv.innerHTML = '<div class="spinner"></div>';
  let items = state.episodes[url];
  if (!items) {
    const result = await window.api.fetchPodcast(url);
    if (result.error) {
      alert('Failed to fetch podcast: ' + result.error);
      episodesDiv.innerHTML = '';
      return;
    }
    items = result.items;
    await Promise.all(items.slice(0, 5).map(async ep => {
      if (!ep.image) ep.image = await fetchOgImage(ep.link);
    }));
    const pod = state.podcasts.find(p => p.url === url);
    if (pod) {
      if (result.feedTitle) pod.title = result.feedTitle;
      if (result.image) pod.image = result.image;
    }
    state.episodes[url] = items;
    scheduleSave();
    renderPodcasts();
  }
  currentPodcast = url;
  currentEpisodes = items;
  renderEpisodes(items);
}

addFeedsBtn.onclick = () => {
  opmlInput.click();
};

addFeedBtn.onclick = async () => {
  const input = await showPrompt('Feed URL', 'https:// or @user');
  if (!input) return;
  let url = input;
  let res;
  if (isBluesky(url)) {
    const handle = bskyHandle(url);
    if (state.feeds.some(f => (f.url || f) === `bsky:${handle}`)) {
      alert('Feed already exists');
      return;
    }
    res = await window.api.fetchBluesky(handle);
    url = `bsky:${handle}`;
  } else {
    if (state.feeds.some(f => (f.url || f) === url)) {
      alert('Feed already exists');
      return;
    }
    res = await window.api.fetchFeed(url);
  }
  if (res.error) {
    alert('Failed to add feed: ' + res.error);
    return;
  }
  state.feeds.push({ url, title: res.feedTitle || url, image: res.image });
  state.articles[url] = res.items;
  scheduleSave();
  renderFeeds();
};

addPodcastBtn.onclick = async () => {
  const input = await showPrompt('Podcast RSS URL or search term');
  if (!input) return;
  let url = input;
  if (!/^https?:/i.test(input)) {
    const results = await window.api.searchPodcasts(input);
    if (!results.length) {
      alert('No results');
      return;
    }
    const choice = await showPrompt(
      'Choose 1-' + results.length + '\n' +
      results.map((r, i) => `${i + 1}: ${r.title}`).join('\n')
    );
    const idx = parseInt(choice, 10) - 1;
    if (results[idx]) url = results[idx].feedUrl; else return;
  }
  if (!url) return;
  if (state.podcasts.some(p => p.url === url)) {
    alert('Podcast already exists');
    return;
  }
  const res = await window.api.fetchPodcast(url);
  if (res.error) {
    alert('Failed to add podcast: ' + res.error);
    return;
  }
  state.podcasts.push({ url, title: res.feedTitle || url, image: res.image });
  state.episodes[url] = res.items;
  scheduleSave();
  renderPodcasts();
};

filterInput.oninput = () => {
  filterText = filterInput.value.toLowerCase();
  renderFeeds();
};

let searchTimer = null;
searchInput.onkeyup = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchText = searchInput.value.toLowerCase();
    updateArticleDisplay();
  }, 150);
};

rangeSelect.onchange = () => {
  if (rangeSelect.value === 'since') {
    sinceDate.style.display = 'inline';
    rangeDays = 0;
  } else {
    sinceDate.style.display = 'none';
    rangeDays = parseInt(rangeSelect.value, 10);
    updateArticleDisplay();
  }
};

sinceDate.onchange = () => {
  updateArticleDisplay();
};

feedDropdown.onchange = () => {
  const val = feedDropdown.value;
  if (val === '*') {
    if (state.articles['*']) {
      currentFeed = '*';
      currentArticles = state.articles['*'];
      updateArticleDisplay();
      setActiveFeedButton('*');
    } else {
      prefetchAll();
    }
  } else {
    loadArticles(val);
  }
};

opmlInput.onchange = async () => {
  const file = opmlInput.files[0];
  if (!file) return;
  state = await window.api.importOpml(file.path);
  state.feeds = normalizeFeeds(state.feeds || []);
  if (!state.read) state.read = {};
  renderFeeds();
  opmlInput.value = '';
};

window.addEventListener('DOMContentLoaded', async () => {
  const data = await window.api.loadData();
  state.feeds = normalizeFeeds(data.feeds || []);
  state.articles = data.articles || {};
  state.feedWeights = data.feedWeights || {};
  state.favorites = data.favorites || [];
  state.favoriteFeeds = data.favoriteFeeds || [];
  state.prefs = data.prefs || {};
  state.podcasts = data.podcasts || [];
  state.episodes = data.episodes || {};
  state.offline = data.offline || [];
  state.read = data.read || {};
  applyTheme();
  applyLayout();
  showPodcastMode(false);
  showNewsMode(false);
  renderFeeds();
  renderPodcasts();
  renderNewsLibrary();
  const def = state.prefs.defaultFeed || '*';
  if (def === '*') {
    currentFeed = '*';
    if (state.articles['*']) {
      currentArticles = state.articles['*'];
      updateArticleDisplay();
    } else if (state.feeds.length) {
      prefetchAll();
    }
    setActiveFeedButton('*');
  } else {
    loadArticles(def);
    if (state.feeds.length) prefetchAll();
  }
});

allFeedsBtn.onclick = () => {
  if (state.articles['*']) {
    currentFeed = '*';
    currentArticles = state.articles['*'];
    updateArticleDisplay();
    setActiveFeedButton('*');
  } else {
    prefetchAll();
  }
};

refreshAllBtn.onclick = () => {
  prefetchAll();
};

podcastLibBtn.onclick = () => {
  showPodcastMode(!podcastMode);
};

newsLibBtn.onclick = () => {
  showNewsMode(!newsMode);
  if (newsMode) renderNewsLibrary();
};

exploreBtn.onclick = () => {
  showFeedSearch();
};

newsSearch.oninput = () => {
  renderNewsLibrary();
};

favoritesBtn.onclick = () => {
  currentFeed = 'favorites';
  currentArticles = state.favorites;
  updateArticleDisplay();
  setActiveFeedButton('favorites');
};
offlineBtn.onclick = () => {
  currentFeed = "offline";
  currentArticles = state.offline;
  updateArticleDisplay();
  setActiveFeedButton("offline");
};

favFeedsBtn.onclick = async () => {
  if (!state.favoriteFeeds.length) return;
  articlesDiv.innerHTML = '<div class="spinner"></div>';
  const list = state.feeds.filter(f => state.favoriteFeeds.includes(f.url || f));
  const { timeline } = await window.buildTimeline(list, url => fetchAny(url, new AbortController()));
  currentFeed = 'favfeeds';
  currentArticles = timeline;
  setActiveFeedButton('favfeeds');
  updateArticleDisplay();
};

settingsBtn.onclick = () => {
  settingsContent.innerHTML = `<h3>Settings</h3>
    <div>Font: <select id="setFont"><option value="sans-serif">Sans</option><option value="serif">Serif</option></select></div>
    <div>Background: <input type="color" id="setBg" value="${state.prefs.bg || '#ffffff'}"/></div>
    <div>Theme: <select id="themeSel"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
    <div>Default Feed: <select id="defaultFeed"><option value="*">All Recent</option>${state.feeds.map(f => `<option value="${f.url}">${f.title || f.url}</option>`).join('')}</select></div>
    <div>Layout: <select id="layoutSel"><option value="sidebar">Sidebar</option><option value="bottom">Bottom Bar</option><option value="gallery">Gallery</option></select></div>
    <div>Text Size: <input type="number" id="textSize" min="12" max="30" value="${state.prefs.textSize || 18}"/></div>
    <button id="closeSettings">Close</button>`;
  settingsModal.style.display = 'flex';
  document.getElementById('setFont').value = state.prefs.font || 'sans-serif';
  document.getElementById('themeSel').value = state.prefs.theme || 'system';
  document.getElementById('defaultFeed').value = state.prefs.defaultFeed || '*';
  document.getElementById('layoutSel').value = state.prefs.layout || 'sidebar';
  document.getElementById('textSize').value = state.prefs.textSize || 18;
  document.getElementById('closeSettings').onclick = () => {
    state.prefs.font = document.getElementById('setFont').value;
    state.prefs.bg = document.getElementById('setBg').value;
    state.prefs.theme = document.getElementById('themeSel').value;
    state.prefs.defaultFeed = document.getElementById('defaultFeed').value;
    state.prefs.layout = document.getElementById('layoutSel').value;
    state.prefs.textSize = parseInt(document.getElementById('textSize').value, 10) || 18;
    settingsModal.style.display = 'none';
    applyTheme();
    applyLayout();
    scheduleSave();
  };
};

fontSelect.onchange = () => {
  state.prefs.font = fontSelect.value;
  applyReaderPrefs();
  scheduleSave();
};

bgColor.oninput = () => {
  state.prefs.bg = bgColor.value;
  applyReaderPrefs();
  scheduleSave();
};

window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    window.api.saveData(state);
  }
});
