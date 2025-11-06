const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
        stabilityThreshold: 1500,
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
  
  createWindow();
});