const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const si = require('systeminformation');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));
  mainWindow.setFullScreen(true);
  
  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Enable node integration in worker for better terminal support
  mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// System information IPC handlers
ipcMain.handle('get-cpu-info', async () => {
  try {
    // Get both current load and CPU info
    const cpuData = await si.cpu();
    const loadData = await si.currentLoad();
    
    // Combine the data
    return {
      ...cpuData,
      currentLoad: loadData.currentLoad,
      cores: cpuData.cores,
      brand: cpuData.brand,
      manufacturer: cpuData.manufacturer,
      model: cpuData.model
    };
  } catch (error) {
    console.error('Error getting CPU info:', error);
    return {};
  }
});

ipcMain.handle('get-memory-info', async () => {
  try {
    return await si.mem();
  } catch (error) {
    console.error('Error getting memory info:', error);
    return {};
  }
});

ipcMain.handle('get-network-info', async () => {
  try {
    return await si.networkStats();
  } catch (error) {
    console.error('Error getting network info:', error);
    return [];
  }
});

ipcMain.handle('get-system-info', async () => {
  try {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      cpus: os.cpus(),
      totalmem: os.totalmem(),
      freemem: os.freemem()
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return {};
  }
});

// Window control IPC handlers
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});