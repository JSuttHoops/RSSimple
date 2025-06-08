const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const addFeedBtn = document.getElementById('addFeed');
const feedsDiv = document.getElementById('feeds');
const filterInput = document.getElementById('feedFilter');
const feedDropdown = document.getElementById('feedDropdown');
const articlesDiv = document.getElementById('articles');
const favoritesBtn = document.getElementById('favoritesBtn');
const searchInput = document.getElementById('searchInput');
const rangeSelect = document.getElementById('rangeSelect');
const sinceDate = document.getElementById('sinceDate');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const readerBar = document.getElementById('readerBar');
const toggleReader = document.getElementById('toggleReader');
const fontSelect = document.getElementById('fontSelect');
const bgColor = document.getElementById('bgColor');
const allFeedsBtn = document.getElementById('allFeeds');
const refreshAllBtn = document.getElementById('refreshAll');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsContent = document.getElementById('settingsContent');
const podcastLibBtn = document.getElementById('podcastLib');
const newsLibBtn = document.getElementById('newsLib');
const addPodcastBtn = document.getElementById('addPodcast');
const podcastFeedsDiv = document.getElementById('podcastFeeds');
const episodesDiv = document.getElementById('episodes');
const newsSearch = document.getElementById('newsSearch');
const newsLibraryDiv = document.getElementById('newsLibrary');
const rssControls = document.getElementById('rssControls');
const podcastControls = document.getElementById('podcastControls');
allFeedsBtn.dataset.feed = '*';
favoritesBtn.dataset.feed = 'favorites';

let state = {
  feeds: [],
  articles: {},
  feedWeights: {},
  favorites: [],
  prefs: {},
  podcasts: [],
  episodes: {}
};
let filterText = '';
let readerMode = false;
let searchText = '';
let rangeDays = 1;
let currentFeed = '*';
let currentArticles = [];
let podcastMode = false;
let currentPodcast = null;
let currentEpisodes = [];
let newsMode = false;

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

function normalizeFeeds(feeds) {
  return feeds.map(f => (typeof f === 'string' ? { url: f, title: '' } : f));
}

function renderFeeds() {
  feedsDiv.innerHTML = '';
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
    const btn = document.createElement('button');
    btn.textContent = title;
    btn.dataset.feed = url;
    btn.onclick = () => loadArticles(url);
    const edit = document.createElement('button');
    edit.textContent = '✎';
    edit.className = 'edit-feed';
    edit.onclick = (e) => {
      e.stopPropagation();
      const val = prompt('Feed Name', title);
      if (val) {
        feed.title = val;
        window.api.saveData(state);
        renderFeeds();
      }
    };
    const del = document.createElement('button');
    del.textContent = '✖';
    del.className = 'del-feed';
    del.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Remove feed?')) {
        state.feeds = state.feeds.filter(f => (f.url || f) !== url);
        delete state.articles[url];
        window.api.saveData(state);
        renderFeeds();
      }
    };
    row.appendChild(btn);
    row.appendChild(edit);
    row.appendChild(del);
    feedsDiv.appendChild(row);
  });
  if (feedDropdown) {
    feedDropdown.innerHTML =
      `<option value="*">All Recent</option>` +
      state.feeds
        .map(f => `<option value="${f.url}">${f.title || f.url}</option>`)
        .join('');
  }
  renderNewsLibrary();
}

function renderPodcasts() {
  podcastFeedsDiv.innerHTML = '';
  state.podcasts.forEach(p => {
    const row = document.createElement('div');
    row.className = 'feed-row';
    const btn = document.createElement('button');
    btn.textContent = p.title || p.url;
    btn.onclick = () => loadEpisodes(p.url);
    const del = document.createElement('button');
    del.textContent = '✖';
    del.className = 'del-feed';
    del.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Remove podcast?')) {
        state.podcasts = state.podcasts.filter(f => f.url !== p.url);
        delete state.episodes[p.url];
        window.api.saveData(state);
        renderPodcasts();
      }
    };
    row.appendChild(btn);
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
    imgBtn.className = 'img-btn';
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
        window.api.saveData(state);
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
      div.appendChild(img);
    }
    const title = document.createElement('div');
    title.innerHTML = `<strong>${ep.title}</strong>`;
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
    play.textContent = 'Play';
    play.onclick = (e) => { e.stopPropagation(); playEpisode(ep); };
    const dl = document.createElement('button');
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
  } else {
    renderArticles(filterArticles(currentArticles));
  }
}

function renderArticles(articles) {
  articlesDiv.innerHTML = '';
  articles.forEach(a => {
    const div = document.createElement('div');
    div.className = 'article';
    if (a.image) {
      const img = document.createElement('img');
      img.src = a.image;
      div.appendChild(img);
    }
    const title = document.createElement('div');
    title.innerHTML = `<strong>${a.title}</strong>`;
    div.appendChild(title);
    if (a.summary) {
      const summary = document.createElement('div');
      summary.className = 'summary';
      summary.textContent = a.summary;
      div.appendChild(summary);
    }
    const btns = document.createElement('div');
    btns.className = 'article-buttons';
    const starBtn = document.createElement('button');
    starBtn.className = 'star-btn';
    starBtn.textContent = isFavorite(a.link) ? '★' : '☆';
    starBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(a, starBtn); };
    const readBtn = document.createElement('button');
    readBtn.textContent = 'Read';
    readBtn.onclick = (e) => { e.stopPropagation(); showArticle(a); };
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = (e) => { e.stopPropagation(); downloadArticle(a); };
    btns.appendChild(starBtn);
    btns.appendChild(readBtn);
    btns.appendChild(downloadBtn);
    div.appendChild(btns);
    articlesDiv.appendChild(div);
  });
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
    ? `<img src="${a.image}" style="max-width:100%;margin-bottom:8px;"/>`
    : '';
  modalContent.innerHTML =
    `<h2>${a.title}</h2>` +
    imgPart +
    `<div class="reader" data-raw="" data-link="${a.link}"></div>`;
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

function applyReaderPrefs() {
  modalContent.style.fontFamily = state.prefs.font || 'sans-serif';
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

async function downloadArticle(a) {
  const file = await window.api.downloadArticle({ url: a.link, title: a.title });
  alert(`Saved to ${file}`);
}

async function downloadEpisode(ep) {
  const file = await window.api.downloadEpisode({ url: ep.audio, title: ep.title });
  alert(`Saved to ${file}`);
}

let audioPlayer = null;
function playEpisode(ep) {
  if (audioPlayer) audioPlayer.pause();
  audioPlayer = new Audio(ep.audio);
  audioPlayer.play();
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
  window.api.saveData(state);
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function prefetchAll() {
  articlesDiv.innerHTML = '<div class="spinner"></div>';
  const { timeline, perFeed } = await window.buildTimeline(state.feeds, window.api.fetchFeed);
  Object.assign(state.articles, perFeed, { '*': timeline });
  await window.api.saveData(state);
  currentFeed = '*';
  currentArticles = timeline;
  updateArticleDisplay();
  setActiveFeedButton('*');
}

async function loadArticles(url) {
  articlesDiv.innerHTML = '<div class="spinner"></div>';
  state.feedWeights[url] = (state.feedWeights[url] || 0) + 1;
  let items = state.articles[url];
  if (!items) {
    const result = await window.api.fetchFeed(url);
    if (result.error) {
      alert('Failed to fetch feed: ' + result.error);
      articlesDiv.innerHTML = '';
      return;
    }
    items = result.items;
    // Attempt to fetch open graph images for items missing a preview
    for (const item of items.slice(0, 10)) {
      if (!item.image) {
        item.image = await fetchOgImage(item.link);
      }
    }
    state.articles[url] = items;
    const feed = state.feeds.find(f => (f.url || f) === url);
    if (feed) {
      if (result.feedTitle) feed.title = result.feedTitle;
      if (result.image) feed.image = result.image;
      renderFeeds();
    }
    await window.api.saveData(state);
  }
  await window.api.saveData(state);
  currentFeed = url;
  currentArticles = items;
  updateArticleDisplay();
  setActiveFeedButton(url);
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
    const pod = state.podcasts.find(p => p.url === url);
    if (pod) {
      if (result.feedTitle) pod.title = result.feedTitle;
      if (result.image) pod.image = result.image;
    }
    state.episodes[url] = items;
    await window.api.saveData(state);
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
  const url = prompt('Feed URL');
  if (!url) return;
  if (state.feeds.some(f => (f.url || f) === url)) {
    alert('Feed already exists');
    return;
  }
  const res = await window.api.fetchFeed(url);
  if (res.error) {
    alert('Failed to add feed: ' + res.error);
    return;
  }
  state.feeds.push({ url, title: res.feedTitle || url, image: res.image });
  state.articles[url] = res.items;
  await window.api.saveData(state);
  renderFeeds();
};

addPodcastBtn.onclick = async () => {
  const input = prompt('Podcast RSS URL or search term');
  if (!input) return;
  let url = input;
  if (!/^https?:/i.test(input)) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?media=podcast&limit=5&term=${encodeURIComponent(input)}`
      );
      const j = await res.json();
      if (!j.results.length) {
        alert('No results');
        return;
      }
      const choice = prompt(
        j.results
          .map((r, i) => `${i + 1}: ${r.collectionName}`)
          .join('\n')
      );
      const idx = parseInt(choice, 10) - 1;
      if (j.results[idx]) url = j.results[idx].feedUrl;
    } catch {}
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
  await window.api.saveData(state);
  renderPodcasts();
};

filterInput.oninput = () => {
  filterText = filterInput.value.toLowerCase();
  renderFeeds();
};

searchInput.oninput = () => {
  searchText = searchInput.value.toLowerCase();
  updateArticleDisplay();
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
  renderFeeds();
  opmlInput.value = '';
};

(async () => {
  const data = await window.api.loadData();
  state.feeds = normalizeFeeds(data.feeds || []);
  state.articles = data.articles || {};
  state.feedWeights = data.feedWeights || {};
  state.favorites = data.favorites || [];
  state.prefs = data.prefs || {};
  state.podcasts = data.podcasts || [];
  state.episodes = data.episodes || {};
  applyTheme();
  applyLayout();
  showPodcastMode(false);
  showNewsMode(false);
  renderFeeds();
  renderPodcasts();
  renderNewsLibrary();
  if (!state.articles['*'] && state.feeds.length) {
    await prefetchAll();
  }
  const def = state.prefs.defaultFeed || '*';
  if (def === '*') {
    if (state.articles['*']) {
      currentFeed = '*';
      currentArticles = state.articles['*'];
      updateArticleDisplay();
      setActiveFeedButton('*');
    }
  } else {
    await loadArticles(def);
  }
})();

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

newsSearch.oninput = () => {
  renderNewsLibrary();
};

favoritesBtn.onclick = () => {
  currentFeed = 'favorites';
  currentArticles = state.favorites;
  updateArticleDisplay();
  setActiveFeedButton('favorites');
};

settingsBtn.onclick = () => {
  settingsContent.innerHTML = `<h3>Settings</h3>
    <div>Font: <select id="setFont"><option value="sans-serif">Sans</option><option value="serif">Serif</option></select></div>
    <div>Background: <input type="color" id="setBg" value="${state.prefs.bg || '#ffffff'}"/></div>
    <div>Theme: <select id="themeSel"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
    <div>Default Feed: <select id="defaultFeed"><option value="*">All Recent</option>${state.feeds.map(f => `<option value="${f.url}">${f.title || f.url}</option>`).join('')}</select></div>
    <div>Layout: <select id="layoutSel"><option value="sidebar">Sidebar</option><option value="bottom">Bottom Bar</option><option value="gallery">Gallery</option></select></div>
    <button id="closeSettings">Close</button>`;
  settingsModal.style.display = 'flex';
  document.getElementById('setFont').value = state.prefs.font || 'sans-serif';
  document.getElementById('themeSel').value = state.prefs.theme || 'system';
  document.getElementById('defaultFeed').value = state.prefs.defaultFeed || '*';
  document.getElementById('layoutSel').value = state.prefs.layout || 'sidebar';
  document.getElementById('closeSettings').onclick = () => {
    state.prefs.font = document.getElementById('setFont').value;
    state.prefs.bg = document.getElementById('setBg').value;
    state.prefs.theme = document.getElementById('themeSel').value;
    state.prefs.defaultFeed = document.getElementById('defaultFeed').value;
    state.prefs.layout = document.getElementById('layoutSel').value;
    settingsModal.style.display = 'none';
    applyTheme();
    applyLayout();
    window.api.saveData(state);
  };
};

fontSelect.onchange = () => {
  state.prefs.font = fontSelect.value;
  applyReaderPrefs();
  window.api.saveData(state);
};

bgColor.oninput = () => {
  state.prefs.bg = bgColor.value;
  applyReaderPrefs();
  window.api.saveData(state);
};
