const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const feedsDiv = document.getElementById('feeds');
const articlesDiv = document.getElementById('articles');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

let state = { feeds: [], articles: [] };

function renderFeeds() {
  feedsDiv.innerHTML = '';
  state.feeds.forEach(feed => {
    const btn = document.createElement('button');
    btn.textContent = feed;
    btn.onclick = () => loadArticles(feed);
    feedsDiv.appendChild(btn);
  });
}

function renderArticles(articles) {
  articlesDiv.innerHTML = '';
  articles.forEach(a => {
    const div = document.createElement('div');
    div.className = 'article';
    div.textContent = a.title;
    div.onclick = () => showArticle(a);
    articlesDiv.appendChild(div);
  });
}

function showArticle(a) {
  modalContent.innerHTML = `<h2>${a.title}</h2><p><a href="${a.link}" target="_blank">Open Link</a></p>`;
  modal.style.display = 'flex';
  modal.onclick = () => { modal.style.display = 'none'; };
}

async function loadArticles(url) {
  articlesDiv.innerHTML = 'Loading...';
  const items = await window.api.fetchFeed(url);
  renderArticles(items);
}

addFeedsBtn.onclick = () => {
  opmlInput.click();
};

opmlInput.onchange = async () => {
  const file = opmlInput.files[0];
  if (!file) return;
  const text = await file.text();
  const parse = require('fast-xml-parser');
  const data = parse.parse(text);
  const outlines = data.opml.body.outline;
  const urls = Array.isArray(outlines) ? outlines.map(o => o['@_xmlUrl']) : [outlines['@_xmlUrl']];
  state.feeds.push(...urls);
  renderFeeds();
  await window.api.saveData(state);
  opmlInput.value = '';
};

(async () => {
  state = await window.api.loadData();
  renderFeeds();
})();
