// Main Application Class
class AICodeEditor {
  constructor() {
    this.editor = null;
    this.currentFile = null;
    this.openFiles = new Map();
    this.activeTabId = null;
    this.currentFolder = null;
    this.history = [];
    this.historyIndex = -1;
    this.isOnlineMode = true;
    this.currentPersona = 'teacher';
    this.wsConnection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    
    this.init().catch(error => {
      console.error('Failed to initialize AI Code Editor:', error);
      this.showError('Failed to initialize application: ' + error.message);
    });
  }

  async init() {
    try {
      // Initialize Monaco Editor
      await this.initMonaco();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Connect to Python backend
      this.connectToBackend();
      
      // Setup auto-save
      this.setupAutoSave();
      
      console.log('AI Code Editor initialized successfully!');
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  async initMonaco() {
    return new Promise((resolve, reject) => {
      // Check if Monaco is available
      if (typeof require === 'undefined') {
        reject(new Error('Monaco Editor loader not available'));
        return;
      }

      require(['vs/editor/editor.main'], () => {
        try {
          const container = document.getElementById('editor-container');
          if (!container) {
            reject(new Error('Editor container not found'));
            return;
          }
          
          this.editor = monaco.editor.create(container, {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: true },
            contextmenu: true,
            selectOnLineNumbers: true,
            glyphMargin: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            wordWrap: 'on',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false
            }
          });

          // Add context menu actions
          this.editor.addAction({
            id: 'explain-code',
            label: '💡 Explain Code',
            contextMenuGroupId: 'ai-actions',
            contextMenuOrder: 1,
            run: (editor) => {
              const selection = editor.getModel().getValueInRange(editor.getSelection());
              if (selection) {
                this.explainCode(selection);
              } else {
                this.addChatMessage('ai', 'Please select some code to explain.');
              }
            }
          });

          this.editor.addAction({
            id: 'translate-code',
            label: '🔄 Translate Code',
            contextMenuGroupId: 'ai-actions',
            contextMenuOrder: 2,
            run: (editor) => {
              const selection = editor.getModel().getValueInRange(editor.getSelection());
              if (selection) {
                this.translateCode(selection);
              } else {
                this.addChatMessage('ai', 'Please select some code to translate.');
              }
            }
          });

          this.editor.addAction({
            id: 'optimize-code',
            label: '⚡ Optimize Code',
            contextMenuGroupId: 'ai-actions',
            contextMenuOrder: 3,
            run: (editor) => {
              const selection = editor.getModel().getValueInRange(editor.getSelection());
              if (selection) {
                this.optimizeCode(selection);
              } else {
                this.addChatMessage('ai', 'Please select some code to optimize.');
              }
            }
          });

          // Listen for content changes
          this.editor.onDidChangeModelContent(() => {
            this.onContentChange();
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        reject(new Error('Failed to load Monaco Editor: ' + error));
      });
    });
  }

  setupEventListeners() {
    // Toolbar buttons
    document.getElementById('new-file-btn').addEventListener('click', () => this.newFile());
    document.getElementById('open-file-btn').addEventListener('click', () => this.openFile());
    document.getElementById('save-file-btn').addEventListener('click', () => this.saveFile());
    document.getElementById('open-folder-btn').addEventListener('click', () => this.openFolder());
    
    // AI controls
    document.getElementById('persona-select').addEventListener('change', (e) => {
      this.currentPersona = e.target.value;
    });
    
    document.getElementById('ai-mode-toggle').addEventListener('change', (e) => {
      this.isOnlineMode = e.target.checked;
      this.updateAIModeDisplay();
    });
    
    // AI action buttons
    document.getElementById('explain-btn').addEventListener('click', () => {
      const selection = this.getSelectedCode();
      if (selection) this.explainCode(selection);
    });
    
    document.getElementById('translate-btn').addEventListener('click', () => {
      const selection = this.getSelectedCode();
      if (selection) this.translateCode(selection);
    });
    
    document.getElementById('optimize-btn').addEventListener('click', () => {
      const selection = this.getSelectedCode();
      if (selection) this.optimizeCode(selection);
    });
    
    // Chat functionality
    document.getElementById('send-chat').addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });
    
    // History controls
    document.getElementById('toggle-history').addEventListener('click', () => this.toggleHistory());
    document.getElementById('create-snapshot').addEventListener('click', () => this.createSnapshot());
    document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
    document.getElementById('close-all-tabs').addEventListener('click', () => this.closeAllTabs());
    
    // File explorer
    document.getElementById('refresh-explorer').addEventListener('click', () => this.refreshExplorer());
    
    // Menu shortcuts with error handling
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event, action) => {
        try {
          switch (event) {
            case 'menu-new-file': 
              this.newFile(); 
              break;
            case 'menu-open-file': 
              this.openFile(); 
              break;
            case 'menu-save-file': 
              this.saveFile(); 
              break;
            case 'menu-explain-code': 
              const selection1 = this.getSelectedCode();
              if (selection1) {
                this.explainCode(selection1);
              } else {
                this.addChatMessage('ai', 'Please select some code to explain.');
              }
              break;
            case 'menu-translate-code':
              const selection2 = this.getSelectedCode();
              if (selection2) {
                this.translateCode(selection2);
              } else {
                this.addChatMessage('ai', 'Please select some code to translate.');
              }
              break;
            case 'menu-optimize-code':
              const selection3 = this.getSelectedCode();
              if (selection3) {
                this.optimizeCode(selection3);
              } else {
                this.addChatMessage('ai', 'Please select some code to optimize.');
              }
              break;
            case 'menu-toggle-ai-mode':
              const toggle = document.getElementById('ai-mode-toggle');
              if (toggle) {
                toggle.checked = !toggle.checked;
                this.isOnlineMode = toggle.checked;
                this.updateAIModeDisplay();
              }
              break;
          }
        } catch (error) {
          console.error('Menu action error:', error);
          this.showError('Menu action failed: ' + error.message);
        }
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
          case 'o':
            e.preventDefault();
            this.openFile();
            break;
          case 's':
            e.preventDefault();
            this.saveFile();
            break;
          case 'e':
            e.preventDefault();
            const selection = this.getSelectedCode();
            if (selection) this.explainCode(selection);
            break;
        }
      }
    });
  }

  connectToBackend() {
    // Prevent multiple connection attempts
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    try {
      this.wsConnection = new WebSocket('ws://localhost:8765');
      
      this.wsConnection.onopen = () => {
        console.log('Connected to Python backend');
        this.addChatMessage('ai', 'Connected to AI backend successfully! 🚀');
        this.reconnectAttempts = 0;
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleBackendResponse(data);
        } catch (error) {
          console.error('Failed to parse backend response:', error);
          this.addChatMessage('ai', 'Error: Received invalid response from backend.');
        }
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.addChatMessage('ai', 'Warning: AI backend connection error. Some features may be limited.');
      };
      
      this.wsConnection.onclose = (event) => {
        console.log('Backend connection closed:', event.code, event.reason);
        this.wsConnection = null;
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connectToBackend(), this.reconnectDelay * this.reconnectAttempts);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.addChatMessage('ai', 'Error: Could not connect to AI backend after multiple attempts.');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.addChatMessage('ai', 'Error: Could not connect to AI backend.');
    }
  }

  setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.currentFile && this.editor && this.hasUnsavedChanges()) {
        this.saveFile(true); // Silent save
      }
    }, 30000);
  }

  // File Operations
  async newFile() {
    const fileId = 'untitled-' + Date.now();
    const fileName = 'Untitled-' + (this.openFiles.size + 1);
    
    const fileData = {
      id: fileId,
      name: fileName,
      content: '',
      path: null,
      language: 'javascript',
      isDirty: false
    };
    
    this.openFiles.set(fileId, fileData);
    this.createTab(fileId, fileName);
    this.switchToTab(fileId);
    
    // Clear editor and set focus
    this.editor.setValue('');
    this.editor.focus();
  }

  async openFile() {
    if (!window.electronAPI) return;
    
    const result = await window.electronAPI.showOpenDialog();
    if (result.canceled || !result.filePaths.length) return;
    
    const filePath = result.filePaths[0];
    await this.loadFile(filePath);
  }

  async loadFile(filePath) {
    if (!window.electronAPI || !filePath) return;
    
    try {
      this.showLoading(true);
      const result = await window.electronAPI.readFile(filePath);
      
      if (!result.success) {
        this.showError('Failed to read file: ' + result.error);
        return;
      }
      
      const fileName = filePath.split(/[/\\]/).pop();
      const fileId = filePath;
      
      // Check if file is already open
      if (this.openFiles.has(fileId)) {
        this.switchToTab(fileId);
        this.showLoading(false);
        return;
      }
      
      // Detect language from file extension
      const language = this.detectLanguage(fileName);
      
      const fileData = {
        id: fileId,
        name: fileName,
        content: result.content,
        path: filePath,
        language: language,
        isDirty: false,
        originalContent: result.content
      };
      
      this.openFiles.set(fileId, fileData);
      this.createTab(fileId, fileName);
      this.switchToTab(fileId);
      
      this.addChatMessage('ai', `📄 Opened file: ${fileName}`);
    } catch (error) {
      this.showError('Error opening file: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async saveFile(silent = false) {
    if (!this.currentFile || !this.editor) return;
    
    const fileData = this.openFiles.get(this.currentFile);
    if (!fileData) return;
    
    const content = this.editor.getValue();
    
    if (!fileData.path) {
      // New file, show save dialog
      if (!window.electronAPI) return;
      
      const result = await window.electronAPI.showSaveDialog();
      if (result.canceled) return;
      
      fileData.path = result.filePath;
      fileData.name = result.filePath.split(/[/\\]/).pop();
      
      // Update tab name
      this.updateTabName(this.currentFile, fileData.name);
    }
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.writeFile(fileData.path, content);
        if (!result.success) {
          this.showError('Failed to save file: ' + result.error);
          return;
        }
      }
      
      fileData.content = content;
      fileData.originalContent = content;
      fileData.isDirty = false;
      this.openFiles.set(this.currentFile, fileData);
      
      this.updateTabDirtyState(this.currentFile, false);
      
      if (!silent) {
        this.addChatMessage('ai', `💾 Saved: ${fileData.name}`);
      }
      
      // Create auto-save snapshot
      this.createSnapshot('Auto-save');
    } catch (error) {
      this.showError('Error saving file: ' + error.message);
    }
  }

  async openFolder() {
    if (!window.electronAPI) return;
    
    const result = await window.electronAPI.showOpenFolderDialog();
    if (result.canceled || !result.filePaths.length) return;
    
    this.currentFolder = result.filePaths[0];
    await this.loadFolderContents(this.currentFolder);
  }

  async loadFolderContents(folderPath, parentElement = null) {
    if (!window.electronAPI) return;
    
    try {
      const result = await window.electronAPI.readDirectory(folderPath);
      if (!result.success) {
        this.showError('Failed to read directory: ' + result.error);
        return;
      }
      
      const fileTree = document.getElementById('file-tree');
      
      if (!parentElement) {
        fileTree.innerHTML = '';
        
        // Add folder header
        const folderHeader = document.createElement('div');
        folderHeader.className = 'file-item folder-item';
        folderHeader.innerHTML = `<span class="icon">📁</span>${folderPath.split(/[/\\]/).pop()}`;
        fileTree.appendChild(folderHeader);
        
        parentElement = fileTree;
      }
      
      // Sort items: folders first, then files
      const items = result.items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'file-item';
        
        if (item.isDirectory) {
          itemElement.classList.add('folder-item');
          itemElement.innerHTML = `<span class="icon">📁</span>${item.name}`;
          itemElement.addEventListener('click', async () => {
            // Toggle folder expansion
            const existingChildren = itemElement.nextElementSibling;
            if (existingChildren && existingChildren.classList.contains('folder-children')) {
              existingChildren.remove();
            } else {
              const childContainer = document.createElement('div');
              childContainer.className = 'folder-children';
              parentElement.insertBefore(childContainer, itemElement.nextSibling);
              await this.loadFolderContents(item.path, childContainer);
            }
          });
        } else {
          const icon = this.getFileIcon(item.name);
          itemElement.innerHTML = `<span class="icon">${icon}</span>${item.name}`;
          itemElement.addEventListener('click', () => {
            this.loadFile(item.path);
          });
        }
        
        parentElement.appendChild(itemElement);
      });
    } catch (error) {
      this.showError('Error loading folder: ' + error.message);
    }
  }

  // Tab Management
  createTab(fileId, fileName) {
    const tabList = document.getElementById('tab-list');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.fileId = fileId;
    
    tab.innerHTML = `
      <span class="tab-name">${fileName}</span>
      <button class="close-tab" onclick="event.stopPropagation(); app.closeTab('${fileId}')">×</button>
    `;
    
    tab.addEventListener('click', () => this.switchToTab(fileId));
    tabList.appendChild(tab);
    
    // Show tab bar if this is the first tab
    if (this.openFiles.size === 1) {
      document.getElementById('tab-bar').style.display = 'flex';
    }
  }

  switchToTab(fileId) {
    const fileData = this.openFiles.get(fileId);
    if (!fileData) return;
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-file-id="${fileId}"]`).classList.add('active');
    
    // Update editor
    this.currentFile = fileId;
    this.activeTabId = fileId;
    
    if (this.editor) {
      this.editor.setValue(fileData.content);
      monaco.editor.setModelLanguage(this.editor.getModel(), fileData.language);
      this.editor.focus();
    }
    
    // Hide welcome screen
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
  }

  closeTab(fileId) {
    const fileData = this.openFiles.get(fileId);
    if (!fileData) return;
    
    // Check for unsaved changes
    if (fileData.isDirty) {
      if (!confirm(`${fileData.name} has unsaved changes. Close anyway?`)) {
        return;
      }
    }
    
    // Remove tab
    const tab = document.querySelector(`[data-file-id="${fileId}"]`);
    if (tab) tab.remove();
    
    // Remove from open files
    this.openFiles.delete(fileId);
    
    // Switch to another tab or show welcome screen
    if (fileId === this.currentFile) {
      const remainingTabs = document.querySelectorAll('.tab');
      if (remainingTabs.length > 0) {
        const nextFileId = remainingTabs[0].dataset.fileId;
        this.switchToTab(nextFileId);
      } else {
        this.currentFile = null;
        this.activeTabId = null;
        if (this.editor) {
          this.editor.setValue('');
        }
        document.getElementById('tab-bar').style.display = 'none';
        document.querySelector('.welcome-screen').style.display = 'flex';
      }
    }
  }

  closeAllTabs() {
    const tabIds = Array.from(this.openFiles.keys());
    tabIds.forEach(id => this.closeTab(id));
  }

  updateTabName(fileId, newName) {
    const tab = document.querySelector(`[data-file-id="${fileId}"] .tab-name`);
    if (tab) {
      tab.textContent = newName;
    }
  }

  updateTabDirtyState(fileId, isDirty) {
    const tab = document.querySelector(`[data-file-id="${fileId}"] .tab-name`);
    if (tab) {
      if (isDirty && !tab.textContent.startsWith('• ')) {
        tab.textContent = '• ' + tab.textContent;
      } else if (!isDirty && tab.textContent.startsWith('• ')) {
        tab.textContent = tab.textContent.substring(2);
      }
    }
  }

  // Content Management
  onContentChange() {
    if (!this.currentFile) return;
    
    const fileData = this.openFiles.get(this.currentFile);
    if (!fileData) return;
    
    const currentContent = this.editor.getValue();
    const isDirty = currentContent !== fileData.originalContent;
    
    if (fileData.isDirty !== isDirty) {
      fileData.isDirty = isDirty;
      this.updateTabDirtyState(this.currentFile, isDirty);
    }
    
    fileData.content = currentContent;
  }

  hasUnsavedChanges() {
    if (!this.currentFile) return false;
    const fileData = this.openFiles.get(this.currentFile);
    return fileData ? fileData.isDirty : false;
  }

  getSelectedCode() {
    if (!this.editor) return '';
    const selection = this.editor.getSelection();
    return this.editor.getModel().getValueInRange(selection);
  }

  // AI Features
  async explainCode(code) {
    if (!code.trim()) {
      this.addChatMessage('user', 'Please select some code to explain.');
      return;
    }
    
    this.addChatMessage('user', `Explain this code: \`\`\`\n${code}\n\`\`\``);
    await this.sendToAI('explain', code);
  }

  async translateCode(code) {
    if (!code.trim()) {
      this.addChatMessage('user', 'Please select some code to translate.');
      return;
    }
    
    // Show language selection dialog
    const targetLanguage = prompt('Translate to which language?', 'python');
    if (!targetLanguage) return;
    
    this.addChatMessage('user', `Translate this code to ${targetLanguage}: \`\`\`\n${code}\n\`\`\``);
    await this.sendToAI('translate', code, { targetLanguage });
  }

  async optimizeCode(code) {
    if (!code.trim()) {
      this.addChatMessage('user', 'Please select some code to optimize.');
      return;
    }
    
    this.addChatMessage('user', `Optimize this code: \`\`\`\n${code}\n\`\`\``);
    await this.sendToAI('optimize', code);
  }

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    
    this.addChatMessage('user', message);
    input.value = '';
    
    await this.sendToAI('chat', message);
  }

  async sendToAI(action, content, options = {}) {
    this.showLoading(true);
    
    const request = {
      action,
      content: content || '',
      persona: this.currentPersona,
      mode: this.isOnlineMode ? 'online' : 'offline',
      timestamp: Date.now(),
      ...options
    };
    
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(request));
        
        // Set a timeout for the request
        setTimeout(() => {
          if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.showLoading(false);
            this.addChatMessage('ai', 'Request timed out. The AI backend may be busy.');
          }
        }, 30000); // 30 second timeout
        
      } catch (error) {
        this.showLoading(false);
        console.error('Failed to send request to backend:', error);
        this.addChatMessage('ai', 'Error: Failed to send request to AI backend.');
      }
    } else {
      // Fallback: simulate AI response
      setTimeout(() => {
        this.handleBackendResponse({
          success: false,
          error: 'AI backend is not available. Please check the connection.'
        });
        this.showLoading(false);
      }, 1000);
    }
  }
    };
    
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(request));
        
        // Set a timeout for the request
        setTimeout(() => {
          if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.showLoading(false);
            this.addChatMessage('ai', 'Request timed out. The AI backend may be busy.');
          }
        }, 30000); // 30 second timeout
        
      } catch (error) {
        this.showLoading(false);
        console.error('Failed to send request to backend:', error);
        this.addChatMessage('ai', 'Error: Failed to send request to AI backend.');
      }
    } else {
      // Fallback: simulate AI response
      setTimeout(() => {
        this.handleBackendResponse({
          success: false,
          error: 'AI backend is not available. Please check the connection.'
        });
        this.showLoading(false);
      }, 1000);
    }
  }

  handleBackendResponse(data) {
    this.showLoading(false);
    
    try {
      if (data.success) {
        this.addChatMessage('ai', data.response || 'Response received successfully.');
      } else {
        this.addChatMessage('ai', `Error: ${data.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error handling backend response:', error);
      this.addChatMessage('ai', 'Error: Failed to process AI response.');
    }
  }

  addChatMessage(sender, message) {
    try {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) {
        console.error('Chat messages container not found');
        return;
      }
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${sender}-message`;
      
      const timestamp = new Date().toLocaleTimeString();
      
      if (sender === 'ai') {
        messageDiv.innerHTML = `<strong>AI Assistant (${timestamp}):</strong> ${this.formatMessage(message)}`;
      } else {
        messageDiv.innerHTML = `<strong>You (${timestamp}):</strong> ${this.formatMessage(message)}`;
      }
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Limit message history to prevent memory issues
      const messages = messagesContainer.querySelectorAll('.chat-message');
      if (messages.length > 100) {
        for (let i = 0; i < 20; i++) {
          messages[i].remove();
        }
      }
    } catch (error) {
      console.error('Error adding chat message:', error);
    }
  }

  formatMessage(message) {
    try {
      if (!message || typeof message !== 'string') {
        return String(message || '');
      }
      
      // Escape HTML to prevent XSS
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      let formatted = escapeHtml(message);
      
      // Convert code blocks (allow only safe HTML)
      formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, 
        '<div class="code-block"><pre><code>$2</code></pre></div>');
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Convert line breaks
      formatted = formatted.replace(/\n/g, '<br>');
      
      return formatted;
    } catch (error) {
      console.error('Error formatting message:', error);
      return String(message || '');
    }
  }

  // History Management
  createSnapshot(label = null) {
    if (!this.currentFile || !this.editor) return;
    
    const timestamp = new Date();
    const snapshot = {
      id: Date.now(),
      label: label || `Snapshot ${this.history.length + 1}`,
      timestamp,
      fileId: this.currentFile,
      content: this.editor.getValue(),
      displayTime: timestamp.toLocaleTimeString()
    };
    
    this.history.push(snapshot);
    this.historyIndex = this.history.length - 1;
    
    this.updateHistoryDisplay();
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  restoreSnapshot(snapshotId) {
    const snapshot = this.history.find(s => s.id === snapshotId);
    if (!snapshot || !this.editor) return;
    
    this.editor.setValue(snapshot.content);
    this.addChatMessage('ai', `⏰ Restored snapshot: ${snapshot.label}`);
    
    this.updateHistoryDisplay();
  }

  updateHistoryDisplay() {
    const timeline = document.getElementById('history-timeline');
    timeline.innerHTML = '';
    
    this.history.forEach((snapshot, index) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      if (index === this.historyIndex) item.classList.add('current');
      
      item.textContent = `${snapshot.label} (${snapshot.displayTime})`;
      item.addEventListener('click', () => this.restoreSnapshot(snapshot.id));
      
      timeline.appendChild(item);
    });
  }

  toggleHistory() {
    const panel = document.getElementById('bottom-panel');
    panel.classList.toggle('collapsed');
    
    const button = document.getElementById('toggle-history');
    button.textContent = panel.classList.contains('collapsed') ? '📈 Show History' : '📉 Hide History';
  }

  clearHistory() {
    if (confirm('Clear all snapshots?')) {
      this.history = [];
      this.historyIndex = -1;
      this.updateHistoryDisplay();
      this.addChatMessage('ai', '🗑️ History cleared');
    }
  }

  // Utility Functions
  detectLanguage(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      json: 'json',
      xml: 'xml',
      md: 'markdown',
      txt: 'plaintext',
      c: 'c',
      cpp: 'cpp',
      java: 'java',
      php: 'php',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      sh: 'shell',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      js: '📜', jsx: '📜', ts: '📘', tsx: '📘',
      py: '🐍', html: '🌐', htm: '🌐', css: '🎨',
      json: '📋', xml: '📄', md: '📝', txt: '📄',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      svg: '🎭', ico: '🖼️', pdf: '📕', zip: '🗜️',
      tar: '🗜️', gz: '🗜️', rar: '🗜️'
    };
    
    return iconMap[ext] || '📄';
  }

  updateAIModeDisplay() {
    const status = this.isOnlineMode ? 'Online' : 'Offline';
    this.addChatMessage('ai', `🔄 AI Mode switched to: ${status}`);
  }

  refreshExplorer() {
    if (this.currentFolder) {
      this.loadFolderContents(this.currentFolder);
    }
  }

  showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) {
      spinner.classList.remove('hidden');
    } else {
      spinner.classList.add('hidden');
    }
  }

  showError(message) {
    console.error(message);
    
    // Show error in chat if available
    if (document.getElementById('chat-messages')) {
      this.addChatMessage('ai', '❌ ' + message);
    } else {
      // Fallback to alert if chat is not available
      alert('Error: ' + message);
    }
  }

  showLoading(show) {
    try {
      const spinner = document.getElementById('loading-spinner');
      if (spinner) {
        if (show) {
          spinner.classList.remove('hidden');
        } else {
          spinner.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Error toggling loading spinner:', error);
    }
  }
}

// Initialize the application with error handling
let app;
document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new AICodeEditor();
  } catch (error) {
    console.error('Failed to initialize AI Code Editor:', error);
    
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 10000;
    `;
    errorDiv.innerHTML = `
      <h3>Initialization Error</h3>
      <p>Failed to start AI Code Editor: ${error.message}</p>
      <p>Please refresh the page or check the console for more details.</p>
    `;
    document.body.appendChild(errorDiv);
  }
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (app && app.addChatMessage) {
    app.addChatMessage('ai', `⚠️ Application error: ${event.error.message}`);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (app && app.addChatMessage) {
    app.addChatMessage('ai', `⚠️ Promise rejection: ${event.reason}`);
  }
});