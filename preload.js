const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  fetchFeed: (url) => ipcRenderer.invoke('fetch-feed', url),
  fetchPodcast: (url) => ipcRenderer.invoke('fetch-podcast', url),
  searchPodcasts: (term) => ipcRenderer.invoke('search-podcasts', term),
  searchFeeds: (term) => ipcRenderer.invoke('search-feeds', term),
  importOpml: (file) => ipcRenderer.invoke('import-opml', file),
  downloadArticle: (info) => ipcRenderer.invoke('download-article', info),
  downloadEpisode: (info) => ipcRenderer.invoke('download-episode', info),
  parseReader: (url) => ipcRenderer.invoke('reader-parse', url),
  openLink: (url) => ipcRenderer.invoke('open-link', url),
  fetchBluesky: (handle) => ipcRenderer.invoke('fetch-bluesky', handle),
  listOllamaModels: () => ipcRenderer.invoke('list-ollama-models'),
  ollamaQuery: (opts) => ipcRenderer.invoke('ollama-query', opts),
  logAiSearch: (info) => ipcRenderer.invoke('log-ai-search', info),
  openAiLog: () => ipcRenderer.invoke('open-ai-log'),
  logMain: (info) => ipcRenderer.invoke('log-main', info),
  openMainLog: () => ipcRenderer.invoke('open-main-log'),
  listFonts: () => ipcRenderer.invoke('list-fonts'),
  addFont: (file) => ipcRenderer.invoke('add-font', file),
  fontPath: (name) => ipcRenderer.invoke('font-path', name),
  removeFont: (name) => ipcRenderer.invoke('remove-font', name)
});
