const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getSavedPath: () => ipcRenderer.invoke('get-saved-path'),
  startWatching: (path) => ipcRenderer.send('start-watching', path),
  downloadFile: (args) => ipcRenderer.send('download-file', args),
  downloadMultipleFiles: (files) => ipcRenderer.send('download-multiple-files', files),
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
  },

  onTriggerUpload: (callback) => {
      const sub = (_, v) => callback(v);
      ipcRenderer.on('trigger-upload-dialog', sub);
      return () => ipcRenderer.removeListener('trigger-upload-dialog', sub);
  },
  onTriggerDownloadAll: (callback) => {
      const sub = (_, v) => callback(v);
      ipcRenderer.on('trigger-download-all', sub);
      return () => ipcRenderer.removeListener('trigger-download-all', sub);
  },
  onTriggerDeleteAll: (callback) => {
      const sub = (_, v) => callback(v);
      ipcRenderer.on('trigger-delete-all', sub);
      return () => ipcRenderer.removeListener('trigger-delete-all', sub);
  },

  onTriggerSortAsc: (callback) => {
      const sub = () => callback();
      ipcRenderer.on('trigger-sort-asc', sub);
      return () => ipcRenderer.removeListener('trigger-sort-asc', sub);
  },
  onTriggerSortDesc: (callback) => {
      const sub = () => callback();
      ipcRenderer.on('trigger-sort-desc', sub);
      return () => ipcRenderer.removeListener('trigger-sort-desc', sub);
  },

  onTriggerViewAll: (callback) => {
      const sub = () => callback();
      ipcRenderer.on('trigger-view-all', sub);
      return () => ipcRenderer.removeListener('trigger-view-all', sub);
  },
  onTriggerViewXml: (callback) => {
      const sub = () => callback();
      ipcRenderer.on('trigger-view-xml', sub);
      return () => ipcRenderer.removeListener('trigger-view-xml', sub);
  },
  onTriggerViewPng: (callback) => {
      const sub = () => callback();
      ipcRenderer.on('trigger-view-png', sub);
      return () => ipcRenderer.removeListener('trigger-view-png', sub);
  }

});