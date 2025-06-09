const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const RSSParser = require('rss-parser');
const parser = new RSSParser({
  customFields: {
    feed: [['itunes:image', 'itunesImage']],
    item: [
      ['itunes:image', 'itunesImage'],
      ['podcast:transcript', 'transcript']
    ]
  }
});
const { JSDOM, VirtualConsole } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const silentConsole = new VirtualConsole();

const USER_DIR = app.getPath('userData');
const DATA_FILE = path.join(USER_DIR, 'data.json');
const FEED_DIR = path.join(USER_DIR, 'feeds');
const OPML_FILE = path.join(FEED_DIR, 'feeds.opml');
const OFFLINE_DIR = path.join(USER_DIR, 'offline');
const LOG_FILE = path.join(USER_DIR, 'ai-search.log');
const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_CTX = 8192; // tokens to allocate per request

function ensureFeedDir() {
  if (!fs.existsSync(FEED_DIR)) {
    fs.mkdirSync(FEED_DIR, { recursive: true });
  }
}

function ensureOfflineDir() {
  if (!fs.existsSync(OFFLINE_DIR)) {
    fs.mkdirSync(OFFLINE_DIR, { recursive: true });
  }
}

function sanitize(name) {
  return name.replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 50);
}

function parseOPML(filePath) {
  try {
    const { XMLParser } = require('fast-xml-parser');
    const text = fs.readFileSync(filePath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const data = parser.parse(text);
    const collect = (node) => {
      let arr = [];
      if (!node) return arr;
      if (Array.isArray(node)) {
        for (const n of node) arr = arr.concat(collect(n));
        return arr;
      }
      if (typeof node === 'object') {
        if (node['@_xmlUrl']) {
          arr.push({
            url: node['@_xmlUrl'],
            title: node['@_title'] || node['@_text'] || node['@_xmlUrl'],
            tags: []
          });
        }
        if (node.outline) arr = arr.concat(collect(node.outline));
      }
      return arr;
    };
    return collect(data.opml?.body?.outline);
  } catch (e) {
    return [];
  }
}

function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!data.favorites) data.favorites = [];
    if (!data.favoriteFeeds) data.favoriteFeeds = [];
    if (!data.podcasts) data.podcasts = [];
    if (!data.episodes) data.episodes = {};
    if (!data.offline) data.offline = [];
    if (!data.read) data.read = {};
    data.feeds = data.feeds.map(f => {
      if (typeof f === 'string') return { url: f, title: '', tags: [] };
      if (!f.tags) f.tags = [];
      return f;
    });
    if (data.feeds.length === 0 && fs.existsSync(OPML_FILE)) {
      const parsed = parseOPML(OPML_FILE);
      const map = new Map(parsed.map(f => [f.url, f]));
      data.feeds = Array.from(map.values());
      saveData(data);
    }
    return data;
  } catch (e) {
    const empty = { feeds: [], articles: {}, feedWeights: {}, favorites: [], favoriteFeeds: [], prefs: {}, podcasts: [], episodes: {}, offline: [], read: {} };
    if (fs.existsSync(OPML_FILE)) {
      const parsed = parseOPML(OPML_FILE);
      const map = new Map(parsed.map(f => [f.url, f]));
      empty.feeds = Array.from(map.values());
      saveData(empty);
    }
    return empty;
  }
}

async function saveData(data) {
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: Math.round(width * 0.7),
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      webviewTag: true,
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  ensureFeedDir();
  ensureOfflineDir();
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (_e, data) => saveData(data));

ipcMain.handle('fetch-feed', async (_e, url) => {
  try {
  const feed = await parser.parseURL(url);
  const items = [];
  for (const i of feed.items) {
    let image =
      i.enclosure?.url ||
      (i['media:content'] && i['media:content'].url) ||
      (i['media:thumbnail'] && i['media:thumbnail'].url) ||
      (i.content && (i.content.match(/<img[^>]+src=\"([^\"]+)\"/) || [])[1]);
    if (!image) {
      try {
        const res = await fetch(i.link);
        const html = await res.text();
        const dom = new JSDOM(html, { url: i.link, virtualConsole: silentConsole });
        const imgEl = dom.window.document.querySelector('img');
        if (imgEl) image = imgEl.src;
      } catch {}
    }
    items.push({
      title: i.title,
      link: i.link,
      image,
      summary: i.contentSnippet || i.summary || '',
      content: i['content:encoded'] || i.content || '',
      isoDate: i.isoDate,
      pubDate: i.pubDate,
      categories: i.categories || [],
      feedTitle: feed.title
    });
  }
    const image = feed.image?.url || '';
    return { feedTitle: feed.title, items, image };
  } catch (e) {
    return { error: e.message, items: [] };
  }
});

ipcMain.handle('fetch-podcast', async (_e, url) => {
  try {
    const feed = await parser.parseURL(url);
    const feedImage = (feed.itunesImage?.href || feed.itunesImage) || feed.image?.url || '';
    const items = feed.items
      .map(i => ({
        title: i.title,
        link: i.link,
        audio: i.enclosure?.url,
        image: (i.itunesImage?.href || i.itunesImage) || i.image || feedImage,
        transcript: i.transcript || '',
        isoDate: i.isoDate,
        pubDate: i.pubDate
      }))
      .filter(i => i.audio);
    return { feedTitle: feed.title, items, image: feedImage };
  } catch (e) {
    return { error: e.message, items: [] };
  }
});

ipcMain.handle('search-podcasts', async (_e, term) => {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?media=podcast&limit=5&term=${encodeURIComponent(term)}`
    );
    const json = await res.json();
    return json.results.map(r => ({ title: r.collectionName, feedUrl: r.feedUrl }));
  } catch {
    return [];
  }
});

ipcMain.handle('search-feeds', async (_e, term) => {
  try {
    const res = await fetch(
      `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(term)}&count=5`
    );
    const json = await res.json();
    return (json.results || []).map(r => ({ title: r.title, url: r.feedId.replace(/^feed\//, '') }));
  } catch {
    return [];
  }
});

ipcMain.handle('import-opml', async (_e, filePath) => {
  ensureFeedDir();
  fs.copyFileSync(filePath, OPML_FILE);
  const feeds = parseOPML(OPML_FILE);
  const data = loadData();
  const map = new Map(feeds.map(f => [f.url, f]));
  data.feeds = Array.from(map.values());
  saveData(data);
  return data;
});

ipcMain.handle('download-article', async (_e, { url, title }) => {
  ensureOfflineDir();
  const res = await fetch(url);
  const html = await res.text();
  let content = html;
  try {
    const dom = new JSDOM(html, { url, virtualConsole: silentConsole });
    const parsed = new Readability(dom.window.document).parse();
    if (parsed && parsed.content) content = parsed.content;
  } catch {}
  const style =
    '<style>body{font-family:sans-serif;margin:16px;}img{max-width:100%;}</style>';
  const file = path.join(OFFLINE_DIR, sanitize(title) + '.html');
  fs.writeFileSync(
    file,
    `<!DOCTYPE html><meta charset="utf-8">${style}${content}`
  );
  return file;
});

ipcMain.handle('download-episode', async (_e, { url, title }) => {
  ensureOfflineDir();
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const ext = path.extname(url).split('?')[0] || '.mp3';
  const file = path.join(OFFLINE_DIR, sanitize(title) + ext);
  fs.writeFileSync(file, Buffer.from(buffer));
  return file;
});

ipcMain.handle('reader-parse', async (_e, url) => {
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html, { url, virtualConsole: silentConsole });
  const article = new Readability(dom.window.document).parse();
  return article.content;
});

ipcMain.handle('open-link', (_e, url) => {
  shell.openExternal(url);
});

ipcMain.handle('list-ollama-models', async () => {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const json = await res.json();
    return json.models.map(m => m.name);
  } catch {
    return [];
  }
});

ipcMain.handle('ollama-query', async (_e, { model, prompt }) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_ctx: OLLAMA_CTX }
      }),
      signal: controller.signal
    });
    const json = await res.json();
    return json.response;
  } catch (e) {
    return 'Error: ' + e.message;
  } finally {
    clearTimeout(id);
  }
});

ipcMain.handle('fetch-bluesky', async (_e, handle) => {
  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=20`);
    const json = await res.json();
    const items = (json.feed || []).map(it => {
      const post = it.post;
      const record = post.record || {};
      const author = post.author?.handle || handle;
      const id = post.uri.split('/').pop();
      const link = `https://bsky.app/profile/${author}/post/${id}`;
      const text = record.text || '';
      const img = post.embed?.images?.[0]?.thumb || post.embed?.images?.[0]?.fullsize || '';
      return {
        title: text.slice(0, 50),
        link,
        image: img,
        summary: text,
        content: text,
        isoDate: post.indexedAt,
        pubDate: record.createdAt,
        feedTitle: handle
      };
    });
    const feedImage = json.feed?.[0]?.post?.author?.avatar || '';
    return { feedTitle: handle, items, image: feedImage };
  } catch (e) {
    return { error: e.message, items: [] };
  }
});

ipcMain.handle('log-ai-search', (_e, { query, results }) => {
  const line = `[${new Date().toISOString()}] ${query} -> ${results}\n`;
  fs.appendFileSync(LOG_FILE, line);
});

ipcMain.handle('open-ai-log', () => {
  shell.openPath(LOG_FILE);
});
