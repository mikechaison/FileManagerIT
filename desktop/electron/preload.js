const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getSavedPath: () => ipcRenderer.invoke('get-saved-path'),
  startWatching: (path) => ipcRenderer.send('start-watching', path),
  downloadFile: (args) => ipcRenderer.send('download-file', args),
  deleteFile: (localPath) => ipcRenderer.send('delete-file', localPath),
  stopWatching: () => ipcRenderer.send('stop-watching'),
  
  onSyncStatus: (callback) => {
    ipcRenderer.on('sync-status', (event, ...args) => callback(...args));
    return () => ipcRenderer.removeListener('sync-status', callback);
  },
  onLocalFileChange: (callback) => {
    ipcRenderer.on('local-file-change', (event, ...args) => callback(...args));
    return () => ipcRenderer.removeListener('local-file-change', callback);
  },
  onLocalFileDelete: (callback) => {
    ipcRenderer.on('local-file-delete', (event, ...args) => callback(...args));
    return () => ipcRenderer.removeListener('local-file-delete', callback);
  }
});