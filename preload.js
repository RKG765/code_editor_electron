const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  
  // Dialog operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenFolderDialog: () => ipcRenderer.invoke('show-open-folder-dialog'),
  
  // Menu event listeners
  onMenuAction: (callback) => {
    const channels = [
      'menu-new-file',
      'menu-open-file', 
      'menu-save-file',
      'menu-explain-code',
      'menu-translate-code', 
      'menu-optimize-code',
      'menu-toggle-ai-mode'
    ];
    
    channels.forEach(channel => {
      ipcRenderer.on(channel, (event) => {
        callback(channel, event);
      });
    });
  },
  
  // Python backend status
  onPythonStatus: (callback) => {
    ipcRenderer.on('python-status', (event, status) => {
      callback(status);
    });
  },
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Get platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Expose Node.js path utilities for the renderer
contextBridge.exposeInMainWorld('pathAPI', {
  join: (...args) => require('path').join(...args),
  dirname: (path) => require('path').dirname(path),
  basename: (path, ext) => require('path').basename(path, ext),
  extname: (path) => require('path').extname(path),
  resolve: (...args) => require('path').resolve(...args),
  sep: require('path').sep
});

// Add console logging for debugging
window.addEventListener("DOMContentLoaded", () => {
  console.log("Enhanced preload script loaded!");
  console.log("Platform:", process.platform);
  console.log("Node version:", process.versions.node);
  console.log("Electron version:", process.versions.electron);
});