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
    const parser = require('fast-xml-parser');
    const text = fs.readFileSync(filePath, 'utf8');
    const data = parser.parse(text);
    const outlines = data.opml.body.outline;
    const urls = Array.isArray(outlines)
      ? outlines.map(o => o['@_xmlUrl']).filter(Boolean)
      : [outlines['@_xmlUrl']];
    return urls;
  } catch (e) {
    return [];
  }
}

function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (data.feeds.length === 0 && fs.existsSync(OPML_FILE)) {
      data.feeds = parseOPML(OPML_FILE);
      saveData(data);
    }
    return data;
  } catch (e) {
    const empty = { feeds: [], articles: [] };
    if (fs.existsSync(OPML_FILE)) {
      empty.feeds = parseOPML(OPML_FILE);
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
