const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const feedsDiv = document.getElementById('feeds');
const filterInput = document.getElementById('feedFilter');
const articlesDiv = document.getElementById('articles');
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
allFeedsBtn.dataset.feed = '*';

let state = { feeds: [], articles: {}, feedWeights: {}, prefs: {} };
let filterText = '';
let readerMode = false;

function setActiveFeedButton(id) {
  document.querySelectorAll('#feeds button, #allFeeds').forEach(b => {
    b.classList.toggle('active', b.dataset.feed === id || (id === '*' && b.id === 'allFeeds'));
  });
}

function applyTheme() {
  document.body.dataset.theme = state.prefs.theme || 'system';
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
    row.appendChild(btn);
    row.appendChild(edit);
    feedsDiv.appendChild(row);
  });
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
    const readBtn = document.createElement('button');
    readBtn.textContent = 'Read';
    readBtn.onclick = (e) => { e.stopPropagation(); showArticle(a); };
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = (e) => { e.stopPropagation(); downloadArticle(a); };
    btns.appendChild(readBtn);
    btns.appendChild(downloadBtn);
    div.appendChild(btns);
    articlesDiv.appendChild(div);
  });
}

async function showArticle(a) {
  let content = a.content;
  if (!content) {
    try {
      const res = await fetch(a.link);
      content = await res.text();
    } catch {
      content = `<p><a href="${a.link}" target="_blank">Open Link</a></p>`;
    }
  }
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
  modal.onclick = () => {
    modal.style.display = 'none';
  };
}

function applyReaderPrefs() {
  modalContent.style.fontFamily = state.prefs.font || 'sans-serif';
  modalContent.style.background = state.prefs.bg || '#fff';
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
  renderArticles(timeline);
  setActiveFeedButton('*');
}

async function loadArticles(url) {
  articlesDiv.innerHTML = '<div class="spinner"></div>';
  state.feedWeights[url] = (state.feedWeights[url] || 0) + 1;
  let items = state.articles[url];
  if (!items) {
    const result = await window.api.fetchFeed(url);
    items = result.items;
    // Attempt to fetch open graph images for items missing a preview
    for (const item of items.slice(0, 10)) {
      if (!item.image) {
        item.image = await fetchOgImage(item.link);
      }
    }
    state.articles[url] = items;
    const feed = state.feeds.find(f => (f.url || f) === url);
    if (feed && result.feedTitle) {
      feed.title = result.feedTitle;
      renderFeeds();
    }
    await window.api.saveData(state);
  }
  await window.api.saveData(state);
  renderArticles(items);
  setActiveFeedButton(url);
}

addFeedsBtn.onclick = () => {
  opmlInput.click();
};

filterInput.oninput = () => {
  filterText = filterInput.value.toLowerCase();
  renderFeeds();
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
  state.prefs = data.prefs || {};
  applyTheme();
  renderFeeds();
  if (!state.articles['*'] && state.feeds.length) {
    await prefetchAll();
  }
  const def = state.prefs.defaultFeed || '*';
  if (def === '*') {
    if (state.articles['*']) {
      renderArticles(state.articles['*']);
      setActiveFeedButton('*');
    }
  } else {
    await loadArticles(def);
  }
})();

allFeedsBtn.onclick = () => {
  if (state.articles['*']) {
    renderArticles(state.articles['*']);
    setActiveFeedButton('*');
  } else {
    prefetchAll();
  }
};

refreshAllBtn.onclick = () => {
  prefetchAll();
};

settingsBtn.onclick = () => {
  settingsContent.innerHTML = `<h3>Settings</h3>
    <div>Font: <select id="setFont"><option value="sans-serif">Sans</option><option value="serif">Serif</option></select></div>
    <div>Background: <input type="color" id="setBg" value="${state.prefs.bg || '#ffffff'}"/></div>
    <div>Theme: <select id="themeSel"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
    <div>Default Feed: <select id="defaultFeed"><option value="*">All Recent</option>${state.feeds.map(f => `<option value="${f.url}">${f.title || f.url}</option>`).join('')}</select></div>
    <button id="closeSettings">Close</button>`;
  settingsModal.style.display = 'flex';
  document.getElementById('setFont').value = state.prefs.font || 'sans-serif';
  document.getElementById('themeSel').value = state.prefs.theme || 'system';
  document.getElementById('defaultFeed').value = state.prefs.defaultFeed || '*';
  document.getElementById('closeSettings').onclick = () => {
    state.prefs.font = document.getElementById('setFont').value;
    state.prefs.bg = document.getElementById('setBg').value;
    state.prefs.theme = document.getElementById('themeSel').value;
    state.prefs.defaultFeed = document.getElementById('defaultFeed').value;
    settingsModal.style.display = 'none';
    applyTheme();
    window.api.saveData(state);
  };
};
