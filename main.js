const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const RSSParser = require('rss-parser');
const parser = new RSSParser();

const USER_DIR = app.getPath('userData');
const DATA_FILE = path.join(USER_DIR, 'data.json');
const FEED_DIR = path.join(USER_DIR, 'feeds');
const OPML_FILE = path.join(FEED_DIR, 'feeds.opml');

function ensureFeedDir() {
  if (!fs.existsSync(FEED_DIR)) {
    fs.mkdirSync(FEED_DIR, { recursive: true });
  }
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
        if (node['@_xmlUrl']) arr.push(node['@_xmlUrl']);
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
    if (data.feeds.length === 0 && fs.existsSync(OPML_FILE)) {
      data.feeds = Array.from(new Set(parseOPML(OPML_FILE)));
      saveData(data);
    }
    return data;
  } catch (e) {
    const empty = { feeds: [], articles: [] };
    if (fs.existsSync(OPML_FILE)) {
      empty.feeds = Array.from(new Set(parseOPML(OPML_FILE)));
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
  const feed = await parser.parseURL(url);
  return feed.items.map(i => ({
    title: i.title,
    link: i.link,
    image: i.enclosure?.url ||
           (i['media:content'] && i['media:content'].url) ||
           (i['media:thumbnail'] && i['media:thumbnail'].url) ||
           (i.content && (i.content.match(/<img[^>]+src=\"([^\"]+)\"/) || [])[1])
  }));
});

ipcMain.handle('import-opml', async (_e, filePath) => {
  ensureFeedDir();
  fs.copyFileSync(filePath, OPML_FILE);
  const urls = parseOPML(OPML_FILE);
  const data = loadData();
  data.feeds = Array.from(new Set(urls));
  saveData(data);
  return data;
});
