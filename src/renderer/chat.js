// Chat functionality for AI Code Editor
class ChatManager {
  constructor() {
    this.chatHistory = [];
    this.maxHistory = 100;
    this.isProcessing = false;
    this.messagesContainer = null;
    this.chatInput = null;
    this.sendButton = null;
    
    this.init();
  }

  init() {
    this.messagesContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-chat');
    
    if (!this.messagesContainer || !this.chatInput || !this.sendButton) {
      console.error('Chat elements not found in DOM');
      return;
    }
    
    this.setupEventListeners();
    this.addWelcomeMessage();
  }

  setupEventListeners() {
    // Send button click
    this.sendButton.addEventListener('click', () => this.handleSendMessage());
    
    // Enter key in chat input
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
    
    // Auto-resize textarea
    this.chatInput.addEventListener('input', () => this.autoResizeTextarea());
  }

  addWelcomeMessage() {
    const welcomeMessage = `Hello! I'm your AI programming assistant. I can help you:

• 💡 **Explain code** - Select code and I'll explain how it works
• 🔄 **Translate code** - Convert between programming languages  
• ⚡ **Optimize code** - Improve performance and readability
• 🤖 **Answer questions** - Ask me anything about programming

Try selecting some code and using the AI buttons, or just ask me a question!`;

    this.addMessage('ai', welcomeMessage);
  }

  handleSendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isProcessing) return;

    // Add user message
    this.addMessage('user', message);
    this.chatInput.value = '';
    this.autoResizeTextarea();

    // Send to AI backend
    if (window.app && window.app.sendToAI) {
      window.app.sendToAI('chat', message);
    } else {
      this.addMessage('ai', 'Sorry, the AI backend is not available right now.');
    }
  }

  addMessage(sender, content, timestamp = null) {
    const message = {
      id: Date.now() + Math.random(),
      sender,
      content,
      timestamp: timestamp || new Date().toLocaleTimeString()
    };

    this.chatHistory.push(message);
    this.displayMessage(message);
    this.limitHistory();
  }

  displayMessage(message) {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.sender}-message`;
    messageDiv.dataset.messageId = message.id;

    const senderName = message.sender === 'user' ? 'You' : 'AI Assistant';
    const formattedContent = this.formatMessage(message.content);

    messageDiv.innerHTML = `
      <div class="message-header">
        <strong>${senderName}</strong>
        <span class="timestamp">${message.timestamp}</span>
      </div>
      <div class="message-content">${formattedContent}</div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    if (!content || typeof content !== 'string') {
      return String(content || '');
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    let formatted = escapeHtml(content);

    // Convert code blocks with language detection
    formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)\n?```/g, (match, language, code) => {
      const lang = language || 'text';
      return `<div class="code-block" data-language="${lang}">
        <div class="code-header">
          <span class="language-label">${lang}</span>
          <button class="copy-code-btn" onclick="chatManager.copyCode(this)">Copy</button>
        </div>
        <pre><code>${code.trim()}</code></pre>
      </div>`;
    });

    // Convert inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Convert markdown-style bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert markdown-style italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert URLs to links
    formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

    return formatted;
  }

  copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.style.background = '#28a745';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      this.addSystemMessage('Failed to copy code to clipboard');
    });
  }

  addSystemMessage(content) {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system-message';
    messageDiv.innerHTML = `
      <div class="message-content">
        <span class="system-icon">ℹ️</span>
        ${this.formatMessage(content)}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addErrorMessage(error) {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message error-message';
    messageDiv.innerHTML = `
      <div class="message-content">
        <span class="error-icon">⚠️</span>
        <strong>Error:</strong> ${this.formatMessage(error)}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    
    if (this.sendButton) {
      this.sendButton.disabled = isProcessing;
      this.sendButton.textContent = isProcessing ? 'Processing...' : 'Send';
    }
    
    if (this.chatInput) {
      this.chatInput.disabled = isProcessing;
    }

    this.toggleTypingIndicator(isProcessing);
  }

  toggleTypingIndicator(show) {
    if (!this.messagesContainer) return;

    const existingIndicator = this.messagesContainer.querySelector('.typing-indicator');
    
    if (show && !existingIndicator) {
      const indicator = document.createElement('div');
      indicator.className = 'chat-message ai-message typing-indicator';
      indicator.innerHTML = `
        <div class="message-header">
          <strong>AI Assistant</strong>
          <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="message-content">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      `;
      this.messagesContainer.appendChild(indicator);
      this.scrollToBottom();
    } else if (!show && existingIndicator) {
      existingIndicator.remove();
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  autoResizeTextarea() {
    if (!this.chatInput) return;
    
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
  }

  limitHistory() {
    if (this.chatHistory.length > this.maxHistory) {
      const toRemove = this.chatHistory.length - this.maxHistory;
      this.chatHistory.splice(0, toRemove);

      // Remove old message elements
      const messages = this.messagesContainer.querySelectorAll('.chat-message');
      for (let i = 0; i < toRemove && i < messages.length; i++) {
        if (!messages[i].classList.contains('system-message')) {
          messages[i].remove();
        }
      }
    }
  }

  clearChat() {
    this.chatHistory = [];
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    this.addWelcomeMessage();
  }

  exportChat() {
    const chatData = {
      timestamp: new Date().toISOString(),
      messages: this.chatHistory.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.addSystemMessage('Chat exported successfully!');
  }

  // Method called by main app when AI response is received
  handleAIResponse(response) {
    this.setProcessing(false);
    
    if (response.success) {
      this.addMessage('ai', response.response || 'Response received.');
    } else {
      this.addErrorMessage(response.error || 'Unknown error occurred');
    }
  }

  // Method called when backend connection status changes
  updateConnectionStatus(status) {
    const statusMessages = {
      connecting: '🔄 Connecting to AI backend...',
      connected: '✅ Connected to AI backend',
      error: '❌ AI backend connection failed',
      disconnected: '⚠️ AI backend disconnected'
    };

    const message = statusMessages[status];
    if (message) {
      this.addSystemMessage(message);
    }
  }
}

// Initialize chat manager when DOM is loaded
let chatManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
  });
} else {
  chatManager = new ChatManager();
}