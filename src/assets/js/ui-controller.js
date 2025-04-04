class UIController {
  constructor() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Window control buttons
    document.getElementById('minimize-btn').addEventListener('click', () => {
      window.api.minimizeWindow();
    });
    
    document.getElementById('maximize-btn').addEventListener('click', () => {
      window.api.maximizeWindow();
    });
    
    document.getElementById('close-btn').addEventListener('click', () => {
      window.api.closeWindow();
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+T: New terminal tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        if (window.terminalManager) {
          window.terminalManager.createNewTab();
        }
      }
      
      // Ctrl+W: Close current terminal tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (window.terminalManager) {
          window.terminalManager.closeTab(window.terminalManager.activeTerminalId);
        }
      }
      
      // Ctrl+Tab: Next terminal tab
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (window.terminalManager) {
          this.switchToNextTab();
        }
      }
      
      // Ctrl+Shift+Tab: Previous terminal tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        if (window.terminalManager) {
          this.switchToPreviousTab();
        }
      }
      
      // Alt+1, Alt+2, etc.: Switch to specific tab
      if (e.altKey && !isNaN(parseInt(e.key)) && parseInt(e.key) > 0) {
        e.preventDefault();
        const tabIndex = parseInt(e.key);
        this.switchToTabByIndex(tabIndex);
      }
      
      // F5: Refresh file explorer
      if (e.key === 'F5') {
        e.preventDefault();
        if (window.fileExplorer) {
          window.fileExplorer.refresh();
        }
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Add debug button handler
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        if (window.terminalManager) {
          const count = window.terminalManager.getActiveTerminalCount();
          alert(`Active terminal count: ${count}`);
          console.log('Active terminals:', window.terminalManager.terminals);
        }
      });
    }
    
    // Add close button to tabs
    this.setupTabCloseButtons();
  }
  
  setupTabCloseButtons() {
    // Add close buttons to existing tabs
    document.querySelectorAll('.tab').forEach(tab => {
      this.addCloseButtonToTab(tab);
    });
    
    // Monitor for new tabs being added
    const tabsContainer = document.getElementById('terminal-tabs');
    if (tabsContainer) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && node.classList.contains('tab') && !node.querySelector('.tab-close')) {
                this.addCloseButtonToTab(node);
              }
            });
          }
        });
      });
      
      observer.observe(tabsContainer, { childList: true });
    }
  }
  
  addCloseButtonToTab(tab) {
    if (!tab.querySelector('.tab-close')) {
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '×';
      closeBtn.style.marginLeft = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.opacity = '0.7';
      closeBtn.style.transition = 'opacity 0.2s';
      
      closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.opacity = '1';
      });
      
      closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.opacity = '0.7';
      });
      
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tab activation
        const tabId = tab.getAttribute('data-tab-id');
        if (window.terminalManager && tabId) {
          window.terminalManager.closeTab(tabId);
        }
      });
      
      tab.appendChild(closeBtn);
    }
  }
  
  switchToNextTab() {
    if (!window.terminalManager) return;
    
    const tabs = Array.from(document.querySelectorAll('.tab'));
    if (tabs.length <= 1) return;
    
    const currentTabIndex = tabs.findIndex(tab => 
      tab.getAttribute('data-tab-id') === window.terminalManager.activeTerminalId
    );
    
    const nextTabIndex = (currentTabIndex + 1) % tabs.length;
    const nextTabId = tabs[nextTabIndex].getAttribute('data-tab-id');
    
    window.terminalManager.setActiveTerminal(nextTabId);
  }
  
  switchToPreviousTab() {
    if (!window.terminalManager) return;
    
    const tabs = Array.from(document.querySelectorAll('.tab'));
    if (tabs.length <= 1) return;
    
    const currentTabIndex = tabs.findIndex(tab => 
      tab.getAttribute('data-tab-id') === window.terminalManager.activeTerminalId
    );
    
    const prevTabIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
    const prevTabId = tabs[prevTabIndex].getAttribute('data-tab-id');
    
    window.terminalManager.setActiveTerminal(prevTabId);
  }
  
  switchToTabByIndex(index) {
    if (!window.terminalManager) return;
    
    const tabs = Array.from(document.querySelectorAll('.tab'));
    if (index > tabs.length) return;
    
    const tabId = tabs[index - 1].getAttribute('data-tab-id');
    window.terminalManager.setActiveTerminal(tabId);
  }
  
  handleResize() {
    // Resize terminal if active
    if (window.terminalManager) {
      const activeTerminal = window.terminalManager.terminals[window.terminalManager.activeTerminalId];
      if (activeTerminal && activeTerminal.fitAddon) {
        activeTerminal.fitAddon.fit();
      }
    }
  }
}

// Initialize UI controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController();
});