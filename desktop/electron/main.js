const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require('electron');
const path = require('path');
const chokidar = require('chokidar');
const fs = require('fs');
const https = require('https');

let store;
let watcher;
let mainWindow;

const downloadQueue = new Set();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL('http://localhost:5173');

// App menu
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Upload',
                    click: () => mainWindow.webContents.send('trigger-upload-dialog')
                },
                {
                    label: 'Download all',
                    click: () => mainWindow.webContents.send('trigger-download-all')
                },
                {
                    label: 'Delete all',
                    click: () => mainWindow.webContents.send('trigger-delete-all')
                },
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Descending',
                    click: () => mainWindow.webContents.send('trigger-sort-desc')
                },
                {
                    label: 'Ascending',
                    click: () => mainWindow.webContents.send('trigger-sort-asc')
                },
                { type: 'separator' },
                {
                    label: 'View all',
                    click: () => mainWindow.webContents.send('trigger-view-all')
                },
                {
                    label: 'View XML',
                    click: () => mainWindow.webContents.send('trigger-view-xml')
                },
                {
                    label: 'View PNG',
                    click: () => mainWindow.webContents.send('trigger-view-png')
                },
                { type: 'separator' },
                { role: 'reload' },
                { role: 'toggleDevTools' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                {role: 'minimize'},
                {role: 'close'}
            ]
        }
    ]

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store();
  } catch (err) {
    app.quit();
    return;
  }

  ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (canceled) return null;

    const folderPath = filePaths[0];
    store.set('syncFolderPath', folderPath); 
    return folderPath;
  });

  ipcMain.handle('get-saved-path', () => {
    return store.get('syncFolderPath');
  });

  // Upload into cloud
  ipcMain.on('start-watching', (event, folderPath) => {
    if (watcher) watcher.close();

    watcher = chokidar.watch(folderPath, {
      ignored: /[\/\\]\./,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 8000,
        pollInterval: 100
      }
    });

    const sendFileToUI = async (localPath, attempt = 1) => {
      const MAX_ATTEMPTS = 5;
      const RETRY_DELAY = 500;
      const fileName = path.basename(localPath);
      
      if (downloadQueue.has(fileName)) {
        console.log(`[Chokidar] Ignoring event for: ${fileName} (download in progress).`);
        return;
      }
      
      try {
        const fileBuffer = await fs.promises.readFile(localPath);
        const stats = await fs.promises.stat(localPath);

        mainWindow.webContents.send('local-file-change', {
          name: fileName,
          path: localPath,
          buffer: fileBuffer,
          lastModified: stats.mtimeMs
        });
        mainWindow.webContents.send('sync-status', `Detected change: ${fileName}`);

      } catch (error) {
        if (error.code === 'EBUSY' && attempt < MAX_ATTEMPTS) {
          console.warn(`[Chokidar] EBUSY on ${fileName}, attempt ${attempt}. Retrying in ${RETRY_DELAY}ms...`);
          setTimeout(() => {
            sendFileToUI(localPath, attempt + 1);
          }, RETRY_DELAY);
        } else {
          console.error(`[Chokidar] Failed to read file ${localPath}:`, error);
          mainWindow.webContents.send('sync-status', `Error reading local file: ${fileName}`);
        }
      }
    };

    const unlinkFile = (localPath) => {
      const fileName = path.basename(localPath);
      if (downloadQueue.has(fileName)) {
        console.log(`[Chokidar] Ignoring unlink event for: ${fileName} (programmatic delete).`);
        return;
      }

      try {
        mainWindow.webContents.send('local-file-delete', {
          name: fileName,
        });
        mainWindow.webContents.send('sync-status', `Detected delete: ${fileName}`);
      } catch (error) {
        console.error(`Failed to process unlink event for ${localPath}:`, error);
      }
    };

    watcher.on('add', sendFileToUI);
    watcher.on('change', sendFileToUI);
    watcher.on('unlink', unlinkFile);

  });

  ipcMain.on('stop-watching', () => {
    if (watcher) {
      watcher.close();
      watcher = null;
      console.log('Stopped file watcher.');
    }
  });

  // Download from cloud
  ipcMain.on('download-file', async (event, { url, localPath, modifiedAt }) => {
    const fileName = path.basename(localPath);
    try {
      downloadQueue.add(fileName);
      mainWindow.webContents.send('sync-status', `Downloading: ${fileName}...`);

      const fileStream = fs.createWriteStream(localPath);

      https.get(url, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
        fileStream.close(async () => { 
          mainWindow.webContents.send('sync-status', `Downloaded: ${fileName}`);

          if (modifiedAt) {
            try {
              const mtime = new Date(modifiedAt);
              await fs.promises.utimes(localPath, mtime, mtime);
              console.log(`Set mtime for ${fileName} to ${mtime.toISOString()}`);
            } catch (err) {
              console.error(`Failed to set mtime for ${fileName}:`, err);
            }
          }
          setTimeout(() => downloadQueue.delete(fileName), 2000); 
        });
      });
      }).on('error', (err) => {
        downloadQueue.add(fileName); 
        fs.unlink(localPath, () => {
          setTimeout(() => downloadQueue.delete(fileName), 2000);
        });
        mainWindow.webContents.send('sync-status', `Error downloading ${fileName}: ${err.message}`);
      });
    } catch (error) {
      mainWindow.webContents.send('sync-status', `Error downloading ${fileName}: ${error.message}`);
      downloadQueue.delete(fileName);
    }
  });

    ipcMain.on('delete-file', async (event, localPath) => {
      const fileName = path.basename(localPath);
      mainWindow.webContents.send('sync-status', `Deleting local file: ${fileName}...`);

      try {
        if (downloadQueue.has(fileName)) {
          console.warn(`Skipping delete for ${fileName}, download in progress.`);
          mainWindow.webContents.send('sync-status', `Delete skipped (downloading): ${fileName}`);
          return;
        }

        downloadQueue.add(fileName);

        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
          console.log(`Locally deleted file: ${fileName}`);
          mainWindow.webContents.send('sync-status', `Deleted local file: ${fileName}`);
        } else {
          console.warn(`Tried to delete ${fileName}, but it doesn't exist locally.`);
          mainWindow.webContents.send('sync-status', `File ${fileName} already deleted.`);
        }

        setTimeout(() => downloadQueue.delete(fileName), 2000);

      } catch (error) {
        console.error(`Failed to delete local file ${fileName}:`, error);
        mainWindow.webContents.send('sync-status', `Error deleting ${fileName}: ${error.message}`);
        downloadQueue.delete(fileName); 
      }
    });

    ipcMain.on('download-multiple-files', async (event, files) => {
        const downloadOneFile = (url, destPath) => {
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(destPath);
                https.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        fs.unlink(destPath, () => {});
                        reject(`Status code: ${response.statusCode}`);
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(destPath, () => {});
                    reject(err.message);
                });
            });
        };

        const win = BrowserWindow.getFocusedWindow();

        const { filePaths, canceled } = await dialog.showOpenDialog(win, {
            title: 'Choose a folder to download',
            properties: ['openDirectory', 'createDirectory']
        });

        if (canceled || filePaths.length === 0) {
            return;
        }

        const targetFolder = filePaths[0];

        const downloadPromises = files.map(file => {
            const safeName = file.name || `file_${Date.now()}.unknown`;
            const destPath = path.join(targetFolder, safeName);
            
            return downloadOneFile(file.url, destPath);
        });

        await Promise.all(downloadPromises);
    });
  
    createWindow();

  // Context menu
  const ctxMenu = new Menu();
    ctxMenu.append(new MenuItem({
        label: 'Upload',
        click: () => mainWindow.webContents.send('trigger-upload-dialog')
    }));
    ctxMenu.append(new MenuItem({
        label: 'Download all',
        click: () => mainWindow.webContents.send('trigger-download-all')
    }));
    ctxMenu.append(new MenuItem({
        label: 'Delete all',
        click: () => mainWindow.webContents.send('trigger-delete-all')
    }));
    ctxMenu.append(new MenuItem({type: 'separator'}));
    ctxMenu.append(new MenuItem({
        label: 'Descending',
        click: () => mainWindow.webContents.send('trigger-sort-desc')
    }));
    ctxMenu.append(new MenuItem({
        label: 'Ascending',
        click: () => mainWindow.webContents.send('trigger-sort-asc')
    }));
    ctxMenu.append(new MenuItem({type: 'separator'}));
    ctxMenu.append(new MenuItem({
        label: 'View all',
        click: () => mainWindow.webContents.send('trigger-view-all')
    }));
    ctxMenu.append(new MenuItem({
        label: 'View XML',
        click: () => mainWindow.webContents.send('trigger-view-xml')
    }));
    ctxMenu.append(new MenuItem({
        label: 'View PNG',
        click: () => mainWindow.webContents.send('trigger-view-png')
    }));
    ctxMenu.append(new MenuItem({type: 'separator'}));
    ctxMenu.append(new MenuItem({role: 'reload'}));
    ctxMenu.append(new MenuItem({role: 'toggleDevTools'}));
    ctxMenu.append(new MenuItem({type: 'separator'}));
    ctxMenu.append(new MenuItem({role: 'minimize'}));
    ctxMenu.append(new MenuItem({role: 'close'}));

  mainWindow.webContents.on('context-menu', function(e, params){
    ctxMenu.popup(mainWindow, params.x, params.y);
  });
});