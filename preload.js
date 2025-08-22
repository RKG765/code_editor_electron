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
  
  // Dialog operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenFolderDialog: () => ipcRenderer.invoke('show-open-folder-dialog'),
  
  // Menu event listeners
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-file', callback);
    ipcRenderer.on('menu-open-file', callback);
    ipcRenderer.on('menu-save-file', callback);
    ipcRenderer.on('menu-explain-code', callback);
    ipcRenderer.on('menu-translate-code', callback);
    ipcRenderer.on('menu-optimize-code', callback);
    ipcRenderer.on('menu-toggle-ai-mode', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("Enhanced preload script loaded!");
});