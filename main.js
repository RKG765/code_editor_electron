const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn } = require("child_process");

let mainWindow;
let pythonProcess = null;

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "src", "renderer", "assets", "icon.png"),
    show: false, // Don't show until ready
  });

  mainWindow.loadFile(path.join(__dirname, "src", "renderer", "index.html"));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startPythonBackend();
  });

  // Create application menu
  createMenu();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-file')
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-file')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save-file')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Explain Code',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-explain-code')
        },
        {
          label: 'Translate Code',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow.webContents.send('menu-translate-code')
        },
        {
          label: 'Optimize Code',
          accelerator: 'CmdOrCtrl+Alt+O',
          click: () => mainWindow.webContents.send('menu-optimize-code')
        },
        { type: 'separator' },
        {
          label: 'Toggle AI Mode',
          accelerator: 'CmdOrCtrl+Alt+A',
          click: () => mainWindow.webContents.send('menu-toggle-ai-mode')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startPythonBackend() {
  const pythonScript = path.join(__dirname, "src", "backend", "api.py");
  
  // Check if Python script exists
  if (!require('fs').existsSync(pythonScript)) {
    console.error('Python backend script not found:', pythonScript);
    return;
  }
  
  // Try python3 first, then python
  const pythonCommands = ['python3', 'python'];
  let pythonCmd = null;
  
  for (const cmd of pythonCommands) {
    try {
      require('child_process').execSync(`${cmd} --version`, { stdio: 'ignore' });
      pythonCmd = cmd;
      break;
    } catch (error) {
      // Continue to next command
    }
  }
  
  if (!pythonCmd) {
    console.error('Python not found in PATH');
    if (mainWindow) {
      mainWindow.webContents.send('python-error', 'Python not found');
    }
    return;
  }
  
  console.log(`Starting Python backend with: ${pythonCmd}`);
  
  pythonProcess = spawn(pythonCmd, [pythonScript], {
    cwd: path.join(__dirname, "src", "backend"),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python Backend: ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Backend Error: ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
    pythonProcess = null;
  });
  
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python backend:', error);
    pythonProcess = null;
  });
}

// File operations with better error handling
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    console.error('Read file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    if (content === undefined || content === null) {
      content = '';
    }
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content.toString(), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Write file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Invalid directory path');
    }
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Create directory error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Invalid directory path');
    }
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
    return { success: true, items };
  } catch (error) {
    console.error('Read directory error:', error);
    return { success: false, error: error.message };
  }
});

// Dialog operations
ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'CSS', extensions: ['css'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Text', extensions: ['txt', 'md'] }
    ]
  });
  return result;
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'CSS', extensions: ['css'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Text', extensions: ['txt', 'md'] }
    ]
  });
  return result;
});

ipcMain.handle('show-open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

app.whenReady().then(() => {
  createWindow();
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('Terminating Python backend...');
    pythonProcess.kill('SIGTERM');
    
    // Force kill if not terminated in 3 seconds
    setTimeout(() => {
      if (pythonProcess && !pythonProcess.killed) {
        console.log('Force killing Python backend...');
        pythonProcess.kill('SIGKILL');
      }
    }, 3000);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});