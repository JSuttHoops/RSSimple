const { app, BrowserWindow, ipcMain } = require('electron');
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
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const USER_DIR = app.getPath('userData');
const DATA_FILE = path.join(USER_DIR, 'data.json');
const FEED_DIR = path.join(USER_DIR, 'feeds');
const OPML_FILE = path.join(FEED_DIR, 'feeds.opml');
const OFFLINE_DIR = path.join(USER_DIR, 'offline');

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
            title: node['@_title'] || node['@_text'] || node['@_xmlUrl']
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
    if (!data.podcasts) data.podcasts = [];
    if (!data.episodes) data.episodes = {};
    if (data.feeds.length === 0 && fs.existsSync(OPML_FILE)) {
      const parsed = parseOPML(OPML_FILE);
      const map = new Map(parsed.map(f => [f.url, f]));
      data.feeds = Array.from(map.values());
      saveData(data);
    }
    return data;
  } catch (e) {
    const empty = { feeds: [], articles: {}, feedWeights: {}, favorites: [], prefs: {}, podcasts: [], episodes: {} };
    if (fs.existsSync(OPML_FILE)) {
      const parsed = parseOPML(OPML_FILE);
      const map = new Map(parsed.map(f => [f.url, f]));
      empty.feeds = Array.from(map.values());
      saveData(empty);
    }
    return empty;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
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
    const items = feed.items.map(i => ({
      title: i.title,
      link: i.link,
      image: i.enclosure?.url ||
             (i['media:content'] && i['media:content'].url) ||
             (i['media:thumbnail'] && i['media:thumbnail'].url) ||
             (i.content && (i.content.match(/<img[^>]+src=\"([^\"]+)\"/) || [])[1]),
      summary: i.contentSnippet || i.summary || '',
      content: i['content:encoded'] || i.content || '',
      isoDate: i.isoDate,
      pubDate: i.pubDate
    }));
    const image = feed.image?.url || '';
    return { feedTitle: feed.title, items, image };
  } catch (e) {
    return { error: e.message, items: [] };
  }
});

ipcMain.handle('fetch-podcast', async (_e, url) => {
  try {
    const feed = await parser.parseURL(url);
    const feedImage = feed.itunesImage || feed.image?.url || '';
    const items = feed.items
      .map(i => ({
        title: i.title,
        link: i.link,
        audio: i.enclosure?.url,
        image: i.itunesImage || i.image || feedImage,
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
  const file = path.join(OFFLINE_DIR, sanitize(title) + '.html');
  fs.writeFileSync(file, html);
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
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  return article.content;
});
