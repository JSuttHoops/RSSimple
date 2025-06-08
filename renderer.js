const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const feedsDiv = document.getElementById('feeds');
const articlesDiv = document.getElementById('articles');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

let state = { feeds: [], articles: {} };

function normalizeFeeds(feeds) {
  return feeds.map(f => (typeof f === 'string' ? { url: f, title: '' } : f));
}

function renderFeeds() {
  feedsDiv.innerHTML = '';
  state.feeds.forEach(feed => {
    const url = feed.url || feed;
    const title = feed.title || url;
    const btn = document.createElement('button');
    btn.textContent = title;
    btn.onclick = () => loadArticles(url);
    feedsDiv.appendChild(btn);
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
    `<div style="overflow:auto;max-height:70vh">${content}</div>`;
  modal.style.display = 'flex';
  modal.onclick = () => {
    modal.style.display = 'none';
  };
}

async function downloadArticle(a) {
  const file = await window.api.downloadArticle({ url: a.link, title: a.title });
  alert(`Saved to ${file}`);
}

async function loadArticles(url) {
  articlesDiv.innerHTML = 'Loading...';
  let items = state.articles[url];
  if (!items) {
    const result = await window.api.fetchFeed(url);
    items = result.items;
    state.articles[url] = items;
    const feed = state.feeds.find(f => (f.url || f) === url);
    if (feed && result.feedTitle) {
      feed.title = result.feedTitle;
      renderFeeds();
    }
    await window.api.saveData(state);
  }
  renderArticles(items);
}

addFeedsBtn.onclick = () => {
  opmlInput.click();
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
  renderFeeds();
})();
