const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  fetchFeed: (url) => ipcRenderer.invoke('fetch-feed', url),
  importOpml: (file) => ipcRenderer.invoke('import-opml', file),
  downloadArticle: (info) => ipcRenderer.invoke('download-article', info),
  parseReader: (url) => ipcRenderer.invoke('reader-parse', url),
});
