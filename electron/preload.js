const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('godlog', {
  browseFolder: (options) => ipcRenderer.invoke('browse-folder', options),
  scanSource: (sourceRoot) => ipcRenderer.invoke('scan-source', sourceRoot),
  extractLogs: (params) => ipcRenderer.invoke('extract-logs', params),
  readLogFile: (filePath) => ipcRenderer.invoke('read-log-file', filePath),
  listExtractedFiles: (destination) => ipcRenderer.invoke('list-extracted-files', destination),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getEventMapping: () => ipcRenderer.invoke('get-event-mapping'),
  onExtractionProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('extraction-progress', handler);
    return () => ipcRenderer.removeListener('extraction-progress', handler);
  },
});
