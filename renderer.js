const opmlInput = document.getElementById('opml');
const addFeedsBtn = document.getElementById('addFeeds');
const feedsDiv = document.getElementById('feeds');
const articlesDiv = document.getElementById('articles');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

let state = { feeds: [], articles: {} };

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
    div.innerHTML = `<strong>${a.title}</strong>`;
    if (a.image) {
      const img = document.createElement('img');
      img.src = a.image;
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      img.style.marginBottom = '4px';
      div.prepend(img);
    }
    div.onclick = () => showArticle(a);
    articlesDiv.appendChild(div);
  });
}

function showArticle(a) {
  const imgPart = a.image
    ? `<img src="${a.image}" style="max-width:100%;margin-bottom:8px;"/>`
    : '';
  modalContent.innerHTML =
    `<h2>${a.title}</h2>` +
    imgPart +
    `<p><a href="${a.link}" target="_blank">Open Link</a></p>`;
  modal.style.display = 'flex';
  modal.onclick = () => {
    modal.style.display = 'none';
  };
}

async function loadArticles(url) {
  articlesDiv.innerHTML = 'Loading...';
  let items = state.articles[url];
  if (!items) {
    items = await window.api.fetchFeed(url);
    state.articles[url] = items;
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
  renderFeeds();
  opmlInput.value = '';
};

(async () => {
  const data = await window.api.loadData();
  state.feeds = data.feeds || [];
  state.articles = data.articles || {};
  renderFeeds();
})();

