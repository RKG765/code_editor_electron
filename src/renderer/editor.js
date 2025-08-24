/**
 * Enhanced Monaco Editor Integration for AI Code Editor
 * Provides comprehensive editor functionality with AI integration
 */

class MonacoEditorManager {
  constructor(app) {
    this.app = app;
    this.editor = null;
    this.isInitialized = false;
    this.currentTheme = 'vs-dark';
    this.currentLanguage = 'javascript';
    this.autoCompleteProvider = null;
    this.hoverProvider = null;
    this.codeActionProvider = null;
    
    // Editor settings
    this.settings = {
      fontSize: 14,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      minimap: { enabled: true },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      showFoldingControls: 'always',
      contextmenu: true,
      selectOnLineNumbers: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      roundedSelection: false
    };
  }

  /**
   * Initialize Monaco Editor with enhanced features
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadMonaco();
      await this.createEditor();
      this.setupEventListeners();
      this.registerCustomProviders();
      this.setupCustomCommands();
      
      this.isInitialized = true;
      console.log('Monaco Editor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      throw error;
    }
  }

  /**
   * Load Monaco Editor with proper configuration
   */
  loadMonaco() {
    return new Promise((resolve, reject) => {
      if (typeof require === 'undefined') {
        reject(new Error('Monaco Editor loader not available'));
        return;
      }

      // Configure Monaco paths
      if (typeof window.require === 'undefined') {
        window.require = { 
          paths: { 'vs': '../../node_modules/monaco-editor/min/vs' } 
        };
      }

      require(['vs/editor/editor.main'], () => {
        try {
          // Register custom themes
          this.registerCustomThemes();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        reject(new Error('Failed to load Monaco Editor: ' + error));
      });
    });
  }

  /**
   * Create the Monaco Editor instance
   */
  async createEditor() {
    const container = document.getElementById('editor-container');
    if (!container) {
      throw new Error('Editor container not found');
    }

    this.editor = monaco.editor.create(container, {
      value: this.getWelcomeCode(),
      language: this.currentLanguage,
      theme: this.currentTheme,
      ...this.settings,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      }
    });

    // Store reference in app for external access
    if (this.app) {
      this.app.editor = this.editor;
    }
  }

  /**
   * Setup event listeners for editor interactions
   */
  setupEventListeners() {
    if (!this.editor) return;

    // Content change events
    this.editor.onDidChangeModelContent((e) => {
      if (this.app && typeof this.app.onContentChange === 'function') {
        this.app.onContentChange();
      }
      this.onContentChange(e);
    });

    // Cursor position change
    this.editor.onDidChangeCursorPosition((e) => {
      this.updateStatusBar(e.position);
    });

    // Selection change
    this.editor.onDidChangeCursorSelection((e) => {
      this.onSelectionChange(e);
    });

    // Focus events
    this.editor.onDidFocusEditorWidget(() => {
      this.onEditorFocus();
    });

    this.editor.onDidBlurEditorWidget(() => {
      this.onEditorBlur();
    });

    // Model change (when switching files)
    this.editor.onDidChangeModel((e) => {
      this.onModelChange(e);
    });

    // Right-click context menu
    this.editor.onContextMenu((e) => {
      this.onContextMenu(e);
    });
  }

  /**
   * Register custom themes
   */
  registerCustomThemes() {
    // AI Code Editor Dark Theme
    monaco.editor.defineTheme('ai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#CCCCCC',
        'editorCursor.foreground': '#A7A7A7',
        'editor.lineHighlightBackground': '#2D2D30',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    });

    // Light theme variant
    monaco.editor.defineTheme('ai-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' }
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#000000'
      }
    });
  }

  /**
   * Register custom language providers for AI features
   */
  registerCustomProviders() {
    // Auto-completion provider
    this.autoCompleteProvider = monaco.languages.registerCompletionItemProvider(['javascript', 'typescript', 'python'], {
      provideCompletionItems: (model, position, context, token) => {
        return this.provideAICompletions(model, position, context);
      }
    });

    // Hover provider for AI explanations
    this.hoverProvider = monaco.languages.registerHoverProvider(['javascript', 'typescript', 'python'], {
      provideHover: (model, position, token) => {
        return this.provideAIHover(model, position);
      }
    });

    // Code action provider for AI suggestions
    this.codeActionProvider = monaco.languages.registerCodeActionProvider(['javascript', 'typescript', 'python'], {
      provideCodeActions: (model, range, context, token) => {
        return this.provideAICodeActions(model, range, context);
      }
    });
  }

  /**
   * Setup custom commands and keyboard shortcuts
   */
  setupCustomCommands() {
    // AI Explain Command
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
      this.explainSelectedCode();
    });

    // AI Translate Command
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT, () => {
      this.translateSelectedCode();
    });

    // AI Optimize Command
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyO, () => {
      this.optimizeSelectedCode();
    });

    // Format Document
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      this.formatDocument();
    });

    // Toggle Comment
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      this.toggleComment();
    });

    // Add context menu actions
    this.addContextMenuActions();
  }

  /**
   * Add custom context menu actions
   */
  addContextMenuActions() {
    // AI Explain Code
    this.editor.addAction({
      id: 'ai-explain-code',
      label: '💡 AI: Explain Code',
      contextMenuGroupId: '1_ai_actions',
      contextMenuOrder: 1,
      run: () => this.explainSelectedCode()
    });

    // AI Translate Code
    this.editor.addAction({
      id: 'ai-translate-code',
      label: '🔄 AI: Translate Code',
      contextMenuGroupId: '1_ai_actions',
      contextMenuOrder: 2,
      run: () => this.translateSelectedCode()
    });

    // AI Optimize Code
    this.editor.addAction({
      id: 'ai-optimize-code',
      label: '⚡ AI: Optimize Code',
      contextMenuGroupId: '1_ai_actions',
      contextMenuOrder: 3,
      run: () => this.optimizeSelectedCode()
    });

    // AI Fix Issues
    this.editor.addAction({
      id: 'ai-fix-issues',
      label: '🔧 AI: Fix Issues',
      contextMenuGroupId: '1_ai_actions',
      contextMenuOrder: 4,
      run: () => this.fixIssuesInCode()
    });

    // Separator
    this.editor.addAction({
      id: 'separator-1',
      label: '',
      contextMenuGroupId: '2_editor_actions',
      contextMenuOrder: 1,
      run: () => {}
    });

    // Format Selection
    this.editor.addAction({
      id: 'format-selection',
      label: '📐 Format Selection',
      contextMenuGroupId: '2_editor_actions',
      contextMenuOrder: 2,
      run: () => this.formatSelection()
    });

    // Copy with Syntax
    this.editor.addAction({
      id: 'copy-with-syntax',
      label: '📋 Copy with Syntax',
      contextMenuGroupId: '2_editor_actions',
      contextMenuOrder: 3,
      run: () => this.copyWithSyntax()
    });
  }

  /**
   * Provide AI-powered auto-completions
   */
  async provideAICompletions(model, position, context) {
    const suggestions = [];
    
    try {
      const lineContent = model.getLineContent(position.lineNumber);
      const wordInfo = model.getWordUntilPosition(position);
      
      // Basic completions based on context
      if (lineContent.includes('console.')) {
        suggestions.push({
          label: 'log',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'log(${1:message})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Log a message to the console'
        });
      }
      
      // Language-specific suggestions
      const language = model.getLanguageId();
      if (language === 'javascript' || language === 'typescript') {
        suggestions.push(...this.getJavaScriptCompletions(wordInfo, lineContent));
      } else if (language === 'python') {
        suggestions.push(...this.getPythonCompletions(wordInfo, lineContent));
      }
      
    } catch (error) {
      console.error('Error providing AI completions:', error);
    }
    
    return { suggestions };
  }

  /**
   * Provide AI-powered hover information
   */
  async provideAIHover(model, position) {
    try {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // Get context around the word
      const line = model.getLineContent(position.lineNumber);
      const language = model.getLanguageId();
      
      // Provide hover information based on context
      const hoverContent = this.generateHoverContent(word.word, line, language);
      
      if (hoverContent) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [{ value: hoverContent }]
        };
      }
    } catch (error) {
      console.error('Error providing hover information:', error);
    }
    
    return null;
  }

  /**
   * Provide AI-powered code actions
   */
  async provideAICodeActions(model, range, context) {
    const actions = [];
    
    try {
      const selectedText = model.getValueInRange(range);
      
      if (selectedText && selectedText.trim()) {
        // Add AI-powered code actions
        actions.push({
          title: '💡 Explain with AI',
          id: 'ai.explain',
          kind: 'quickfix',
          run: () => this.explainCode(selectedText)
        });
        
        actions.push({
          title: '⚡ Optimize with AI',
          id: 'ai.optimize',
          kind: 'refactor',
          run: () => this.optimizeCode(selectedText)
        });
        
        actions.push({
          title: '🔄 Translate with AI',
          id: 'ai.translate',
          kind: 'refactor',
          run: () => this.translateCode(selectedText)
        });
      }
    } catch (error) {
      console.error('Error providing code actions:', error);
    }
    
    return { actions };
  }

  /**
   * Event handlers
   */
  onContentChange(event) {
    // Update word count and other statistics
    this.updateStatistics();
    
    // Trigger syntax highlighting updates
    this.updateSyntaxHighlighting();
    
    // Auto-save trigger (handled by app)
    if (this.app && typeof this.app.markDirty === 'function') {
      this.app.markDirty();
    }
  }

  onSelectionChange(event) {
    const selection = event.selection;
    const selectedText = this.editor.getModel().getValueInRange(selection);
    
    // Update selection info in status bar
    this.updateSelectionInfo(selection, selectedText);
    
    // Enable/disable AI action buttons based on selection
    this.updateAIButtonStates(!!selectedText.trim());
  }

  onEditorFocus() {
    // Update UI state when editor gains focus
    document.body.classList.add('editor-focused');
  }

  onEditorBlur() {
    // Update UI state when editor loses focus
    document.body.classList.remove('editor-focused');
  }

  onModelChange(event) {
    if (event.newModelUrl) {
      // Update language and other settings based on new model
      const language = this.detectLanguageFromUri(event.newModelUrl.toString());
      this.setLanguage(language);
    }
  }

  onContextMenu(event) {
    // Custom context menu handling if needed
    console.log('Context menu at:', event.target.position);
  }

  /**
   * AI Integration Methods
   */
  explainSelectedCode() {
    const selection = this.getSelectedText();
    if (selection && this.app && typeof this.app.explainCode === 'function') {
      this.app.explainCode(selection);
    } else {
      this.showMessage('Please select some code to explain.');
    }
  }

  translateSelectedCode() {
    const selection = this.getSelectedText();
    if (selection && this.app && typeof this.app.translateCode === 'function') {
      this.app.translateCode(selection);
    } else {
      this.showMessage('Please select some code to translate.');
    }
  }

  optimizeSelectedCode() {
    const selection = this.getSelectedText();
    if (selection && this.app && typeof this.app.optimizeCode === 'function') {
      this.app.optimizeCode(selection);
    } else {
      this.showMessage('Please select some code to optimize.');
    }
  }

  fixIssuesInCode() {
    const selection = this.getSelectedText() || this.editor.getValue();
    if (selection && this.app && typeof this.app.fixCode === 'function') {
      this.app.fixCode(selection);
    }
  }

  /**
   * Editor Control Methods
   */
  setValue(content, language = null) {
    if (!this.editor) return;
    
    this.editor.setValue(content || '');
    
    if (language) {
      this.setLanguage(language);
    }
    
    // Reset undo/redo history for new content
    this.editor.pushUndoStop();
  }

  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  getSelectedText() {
    if (!this.editor) return '';
    
    const selection = this.editor.getSelection();
    return this.editor.getModel().getValueInRange(selection);
  }

  setLanguage(language) {
    if (!this.editor || !language) return;
    
    this.currentLanguage = language;
    monaco.editor.setModelLanguage(this.editor.getModel(), language);
    
    // Update syntax highlighting
    this.updateSyntaxHighlighting();
  }

  setTheme(theme) {
    if (!this.editor) return;
    
    this.currentTheme = theme;
    monaco.editor.setTheme(theme);
  }

  formatDocument() {
    if (!this.editor) return;
    
    this.editor.getAction('editor.action.formatDocument').run();
  }

  formatSelection() {
    if (!this.editor) return;
    
    this.editor.getAction('editor.action.formatSelection').run();
  }

  toggleComment() {
    if (!this.editor) return;
    
    this.editor.getAction('editor.action.commentLine').run();
  }

  insertSnippet(snippet) {
    if (!this.editor) return;
    
    this.editor.trigger('keyboard', 'type', { text: snippet });
  }

  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * Utility Methods
   */
  getWelcomeCode() {
    return `// Welcome to AI Code Editor!
// This editor is powered by AI and provides intelligent assistance

function welcome() {
  console.log("Hello, AI Code Editor!");
  console.log("✨ Try these AI features:");
  console.log("💡 Select code and use Ctrl+E to explain");
  console.log("🔄 Use Ctrl+T to translate between languages");
  console.log("⚡ Use Ctrl+Alt+O to optimize code");
}

// Start coding and let AI assist you!
welcome();`;
  }

  detectLanguageFromUri(uri) {
    const ext = uri.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'sql': 'sql',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'php': 'php'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  getJavaScriptCompletions(wordInfo, lineContent) {
    const completions = [];
    
    // Common JavaScript patterns
    if (lineContent.includes('function') || lineContent.includes('=>')) {
      completions.push({
        label: 'async function',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'async function ${1:name}(${2:params}) {\n\t${3:// code}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create an async function'
      });
    }
    
    return completions;
  }

  getPythonCompletions(wordInfo, lineContent) {
    const completions = [];
    
    // Common Python patterns
    if (lineContent.includes('def') || lineContent.includes('class')) {
      completions.push({
        label: 'def method',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'def ${1:method_name}(self${2:, params}):\n\t"""${3:docstring}"""\n\t${4:pass}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a method with docstring'
      });
    }
    
    return completions;
  }

  generateHoverContent(word, line, language) {
    // Basic hover content generation
    const commonWords = {
      'function': 'JavaScript function declaration',
      'const': 'Constant variable declaration',
      'let': 'Block-scoped variable declaration',
      'var': 'Function-scoped variable declaration',
      'async': 'Asynchronous function modifier',
      'await': 'Wait for Promise resolution',
      'class': 'Class declaration',
      'def': 'Python function definition',
      'import': 'Module import statement',
      'export': 'Module export statement'
    };
    
    return commonWords[word.toLowerCase()] || null;
  }

  updateStatistics() {
    // Update word count, line count, etc.
    if (!this.editor) return;
    
    const model = this.editor.getModel();
    const lineCount = model.getLineCount();
    const wordCount = model.getValue().split(/\s+/).filter(word => word.length > 0).length;
    
    // Update status bar if available
    this.updateStatusBar(null, { lineCount, wordCount });
  }

  updateSyntaxHighlighting() {
    // Trigger syntax highlighting refresh
    if (this.editor) {
      this.editor.trigger('source', 'editor.action.forceRetokenize');
    }
  }

  updateStatusBar(position, stats) {
    // Update status bar with position and statistics
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      let content = '';
      
      if (position) {
        content += `Line ${position.lineNumber}, Column ${position.column}`;
      }
      
      if (stats) {
        content += ` | Lines: ${stats.lineCount} | Words: ${stats.wordCount}`;
      }
      
      statusBar.textContent = content;
    }
  }

  updateSelectionInfo(selection, selectedText) {
    // Update UI based on selection
    const hasSelection = selectedText.length > 0;
    
    // Update selection info in status bar
    if (hasSelection) {
      const lines = selectedText.split('\n').length;
      const chars = selectedText.length;
      console.log(`Selection: ${lines} lines, ${chars} characters`);
    }
  }

  updateAIButtonStates(hasSelection) {
    // Enable/disable AI buttons based on selection
    const aiButtons = document.querySelectorAll('.ai-actions button');
    aiButtons.forEach(button => {
      button.disabled = !hasSelection;
    });
  }

  copyWithSyntax() {
    const selectedText = this.getSelectedText();
    const language = this.currentLanguage;
    
    if (selectedText) {
      const formattedText = `\`\`\`${language}\n${selectedText}\n\`\`\``;
      navigator.clipboard.writeText(formattedText).then(() => {
        this.showMessage('Code copied with syntax highlighting!');
      }).catch(err => {
        console.error('Failed to copy code:', err);
        this.showMessage('Failed to copy code');
      });
    }
  }

  showMessage(message) {
    // Show a temporary message to the user
    console.log('Editor Message:', message);
    
    // If app has a message system, use it
    if (this.app && typeof this.app.addChatMessage === 'function') {
      this.app.addChatMessage('ai', message);
    }
  }

  /**
   * Cleanup method
   */
  dispose() {
    if (this.autoCompleteProvider) {
      this.autoCompleteProvider.dispose();
    }
    
    if (this.hoverProvider) {
      this.hoverProvider.dispose();
    }
    
    if (this.codeActionProvider) {
      this.codeActionProvider.dispose();
    }
    
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    
    this.isInitialized = false;
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonacoEditorManager;
} else if (typeof window !== 'undefined') {
  window.MonacoEditorManager = MonacoEditorManager;
}