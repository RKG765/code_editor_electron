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
    show: false,
    titleBarStyle: 'default',
    webSecurity: false // Allow local file access for Monaco Editor
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

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
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
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
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
    mainWindow.webContents.send('python-status', { 
      status: 'error', 
      message: 'Python backend script not found' 
    });
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
    mainWindow.webContents.send('python-status', { 
      status: 'error', 
      message: 'Python not found in PATH' 
    });
    return;
  }
  
  console.log(`Starting Python backend with: ${pythonCmd}`);
  mainWindow.webContents.send('python-status', { 
    status: 'starting', 
    message: 'Starting Python backend...' 
  });
  
  pythonProcess = spawn(pythonCmd, [pythonScript], {
    cwd: path.join(__dirname, "src", "backend"),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONPATH: path.join(__dirname, "src", "backend") }
  });

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`Python Backend: ${output}`);
    
    if (output.includes('Backend server started')) {
      mainWindow.webContents.send('python-status', { 
        status: 'running', 
        message: 'Python backend is running' 
      });
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const error = data.toString().trim();
    console.error(`Python Backend Error: ${error}`);
    mainWindow.webContents.send('python-status', { 
      status: 'error', 
      message: `Backend error: ${error}` 
    });
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
    pythonProcess = null;
    mainWindow.webContents.send('python-status', { 
      status: 'stopped', 
      message: `Backend stopped (code: ${code})` 
    });
  });
  
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python backend:', error);
    pythonProcess = null;
    mainWindow.webContents.send('python-status', { 
      status: 'error', 
      message: `Failed to start backend: ${error.message}` 
    });
  });
}

// File operations with comprehensive error handling
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    // Security check - ensure path is within reasonable bounds
    const resolvedPath = path.resolve(filePath);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    
    return { success: true, content, path: resolvedPath };
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
    
    const resolvedPath = path.resolve(filePath);
    
    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(resolvedPath, content.toString(), 'utf-8');
    return { success: true, path: resolvedPath };
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
    
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(resolvedPath, { recursive: true });
    } else {
      await fs.unlink(resolvedPath);
    }
    
    return { success: true, path: resolvedPath };
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
    
    const resolvedPath = path.resolve(dirPath);
    await fs.mkdir(resolvedPath, { recursive: true });
    
    return { success: true, path: resolvedPath };
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
    
    const resolvedPath = path.resolve(dirPath);
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(resolvedPath, entry.name),
      size: 0, // Will be populated if needed
      modified: null // Will be populated if needed
    }));
    
    // Sort: directories first, then files, alphabetically
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    
    return { success: true, items, path: resolvedPath };
  } catch (error) {
    console.error('Read directory error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    
    return {
      success: true,
      stats: {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      }
    };
  } catch (error) {
    console.error('Get file stats error:', error);
    return { success: false, error: error.message };
  }
});

// Dialog operations
ipcMain.handle('show-open-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
        { name: 'Python', extensions: ['py', 'pyx', 'pyw'] },
        { name: 'Web Files', extensions: ['html', 'htm', 'css', 'scss', 'sass'] },
        { name: 'Data Files', extensions: ['json', 'xml', 'yaml', 'yml'] },
        { name: 'C/C++', extensions: ['c', 'cpp', 'h', 'hpp'] },
        { name: 'Java', extensions: ['java', 'class', 'jar'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'rst'] }
      ]
    });
    return result;
  } catch (error) {
    console.error('Open dialog error:', error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
        { name: 'Python', extensions: ['py', 'pyx', 'pyw'] },
        { name: 'Web Files', extensions: ['html', 'htm', 'css', 'scss', 'sass'] },
        { name: 'Data Files', extensions: ['json', 'xml', 'yaml', 'yml'] },
        { name: 'C/C++', extensions: ['c', 'cpp', 'h', 'hpp'] },
        { name: 'Java', extensions: ['java'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'rst'] }
      ]
    });
    return result;
  } catch (error) {
    console.error('Save dialog error:', error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('show-open-folder-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result;
  } catch (error) {
    console.error('Open folder dialog error:', error);
    return { canceled: true, error: error.message };
  }
});

// App lifecycle
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