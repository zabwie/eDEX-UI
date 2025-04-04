// Remove any require statements at the top of the file
class TerminalManager {
  constructor() {
    this.terminals = {};
    this.activeTerminalId = 'terminal-1';
    this.terminalCount = 1;
    this.isInitializing = true;
    this.totalTerminalsCreated = 1; // Track total terminals created for unique IDs
    
    this.initTerminals();
    this.setupEventListeners();
    this.updateTerminalCounter();
  }
  
  initTerminals() {
    console.log('Creating initial terminal...');
    // Only create one terminal on startup
    this.createTerminal('terminal-1');
    this.setActiveTerminal('terminal-1');
  }
  
  createTerminal(id) {
    console.log(`Creating terminal ${id}`);
    const terminalElement = document.getElementById(id);
    if (!terminalElement) {
      console.error(`Terminal element with id ${id} not found`);
      return;
    }
    
    // Create xterm.js instance with optimized settings
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: 'rgba(0, 10, 0, 0.85)',
        foreground: '#00ff00',
        cursor: '#00ff66'
      },
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      allowTransparency: true,
      scrollback: 1000, // Limit scrollback to reduce memory usage
      disableStdin: false,
      rendererType: 'canvas', // Use canvas renderer for better performance
      macOptionIsMeta: false,
      macOptionClickForcesSelection: false
    });
    
    // Create fit addon
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    
    // Create web links addon
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    term.open(terminalElement);
    fitAddon.fit();
    
    // Make sure terminal is focused when clicked
    terminalElement.addEventListener('click', () => {
      term.focus();
      console.log('Terminal focused by click');
    });
    
    // Force focus on terminal
    setTimeout(() => {
      term.focus();
      console.log('Terminal focused on creation');
    }, 100);
    
    // Throttle console logging to reduce CPU usage
    const throttledLog = (message, data) => {
      // Only log every 2 seconds at most
      if (!this._lastLogTime || Date.now() - this._lastLogTime > 2000) {
        console.log(message, data);
        this._lastLogTime = Date.now();
      }
    };
    
    // Start process
    try {
      console.log(`Starting process for terminal ${id}`);
      const shell = window.api.platform === 'win32' ? 'powershell.exe' : 'bash';
      const shellArgs = window.api.platform === 'win32' ? ['-NoLogo'] : [];
      
      const ptyProcess = window.api.spawnProcess(shell, shellArgs, {
        cwd: window.api.homedir
      });
      
      // Handle terminal input with throttled logging
      term.onData(data => {
        try {
          ptyProcess.write(data);
        } catch (error) {
          console.error('Error writing to process:', error);
        }
      });
      
      // Reduce rendering frequency
      let renderThrottleTimeout;
      ptyProcess.onData(data => {
        try {
          // Use requestAnimationFrame to sync with display refresh
          if (!renderThrottleTimeout) {
            renderThrottleTimeout = requestAnimationFrame(() => {
              term.write(data);
              renderThrottleTimeout = null;
            });
          }
        } catch (error) {
          console.error('Error writing to terminal:', error);
        }
      });
      
      // Handle terminal errors
      if (ptyProcess.onError) {
        ptyProcess.onError(data => {
          try {
            term.write('\r\n\x1b[31m' + data + '\x1b[0m');
          } catch (error) {
            console.error('Error writing error to terminal:', error);
          }
        });
      }
      
      // Handle process exit
      ptyProcess.onExit(exitData => {
        const exitCode = typeof exitData === 'object' ? exitData.exitCode : exitData;
        term.writeln(`\r\n\x1b[33mProcess exited with code ${exitCode || 0}. Press any key to restart...\x1b[0m`);
        
        const disposable = term.onKey(() => {
          disposable.dispose();
          this.restartTerminal(id);
        });
      });
      
      // Handle terminal resize
      // Throttle resize events more aggressively
      let resizeTimeout;
      const resizeHandler = () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        
        resizeTimeout = setTimeout(() => {
          if (this.terminals[id] && this.terminals[id].fitAddon) {
            try {
              this.terminals[id].fitAddon.fit();
              const dimensions = this.terminals[id].fitAddon.proposeDimensions();
              if (dimensions && dimensions.cols && dimensions.rows && ptyProcess.resize) {
                ptyProcess.resize(dimensions.cols, dimensions.rows);
              }
            } catch (error) {
              console.error('Error resizing terminal:', error);
            }
          }
        }, 200); // More aggressive throttling
      };
      
      // Use passive event listener to reduce CPU usage
      window.addEventListener('resize', resizeHandler, { passive: true });
      
      // Store terminal instance
      this.terminals[id] = {
        term,
        fitAddon,
        ptyProcess,
        cwd: window.api.homedir,
        resizeHandler
      };
      
      // Update current path in status bar
      const pathElement = document.getElementById('current-path');
      if (pathElement) pathElement.textContent = window.api.homedir;
      
      const userElement = document.getElementById('current-user');
      if (userElement) userElement.textContent = window.api.username;
      
      // Initial resize
      setTimeout(resizeHandler, 100);
      
    } catch (error) {
      console.error('Error creating terminal:', error);
      term.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }
  
  setActiveTerminal(id) {
    // Hide all terminals
    document.querySelectorAll('.terminal').forEach(el => {
      el.classList.remove('active');
    });
    
    // Show active terminal
    document.getElementById(id).classList.add('active');
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.remove('active');
    });
    
    document.querySelector(`.tab[data-tab-id="${id}"]`).classList.add('active');
    
    // Set active terminal ID
    this.activeTerminalId = id;
    
    // Focus terminal
    if (this.terminals[id]) {
      this.terminals[id].term.focus();
    }
  }
  
  createNewTab() {
    this.totalTerminalsCreated++;
    const id = `terminal-${this.totalTerminalsCreated}`;
    
    // Create terminal element
    const terminalElement = document.createElement('div');
    terminalElement.id = id;
    terminalElement.className = 'terminal';
    document.getElementById('terminals').appendChild(terminalElement);
    
    // Create tab element
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.setAttribute('data-tab-id', id);
    tabElement.textContent = `Terminal ${this.totalTerminalsCreated}`;
    tabElement.addEventListener('click', () => {
      this.setActiveTerminal(id);
    });
    
    // Add tab to the tabs container
    const tabsContainer = document.getElementById('terminal-tabs');
    const newTabBtn = document.getElementById('new-tab-btn');
    
    // Check if new-tab-btn exists and is a child of tabsContainer before using insertBefore
    if (newTabBtn && tabsContainer.contains(newTabBtn)) {
      tabsContainer.insertBefore(tabElement, newTabBtn);
    } else {
      // If new-tab-btn doesn't exist or isn't a child, just append the tab
      tabsContainer.appendChild(tabElement);
    }
    
    // Create terminal
    this.createTerminal(id);
    
    // Set as active
    this.setActiveTerminal(id);
    
    // Update terminal counter
    this.updateTerminalCounter();
  }
  
  closeTab(id) {
    // Don't close the last tab
    if (Object.keys(this.terminals).length <= 1) {
      return;
    }
    
    // Kill process
    if (this.terminals[id] && this.terminals[id].ptyProcess) {
      this.terminals[id].ptyProcess.kill();
    }
    
    // Remove terminal element
    const terminalElement = document.getElementById(id);
    if (terminalElement) {
      terminalElement.remove();
    }
    
    // Remove tab element
    const tabElement = document.querySelector(`.tab[data-tab-id="${id}"]`);
    if (tabElement) {
      tabElement.remove();
    }
    
    // Remove from terminals object
    delete this.terminals[id];
    
    // Set another terminal as active if this was the active one
    if (this.activeTerminalId === id) {
      const newActiveId = Object.keys(this.terminals)[0];
      this.setActiveTerminal(newActiveId);
    }
    
    // Update terminal counter
    this.updateTerminalCounter();
  }
  
  // Add this new method to update the terminal counter
  // Modify the updateTerminalCounter method to work with the renderer structure
  updateTerminalCounter() {
    const count = Object.keys(this.terminals).length;
    
    // Update the status bar with terminal count
    const terminalCountElement = document.getElementById('terminal-count');
    if (terminalCountElement) {
      terminalCountElement.textContent = `Terminals: ${count}`;
    } else {
      // Create the element if it doesn't exist
      const statusBar = document.querySelector('.status-bar');
      if (statusBar) {
        const countElement = document.createElement('div');
        countElement.id = 'terminal-count';
        countElement.className = 'status-item';
        countElement.textContent = `Terminals: ${count}`;
        statusBar.appendChild(countElement);
      }
    }
    
    console.log(`Terminal count updated: ${count}`);
  }
  
  restartTerminal(id) {
    // Close and recreate terminal
    if (this.terminals[id] && this.terminals[id].ptyProcess) {
      this.terminals[id].ptyProcess.kill();
    }
    
    this.createTerminal(id);
  }
  
  // Add a method to close all terminals
  // Add this method to the TerminalManager class
  getActiveTerminalCount() {
    return Object.keys(this.terminals).length;
  }
  
  // Modify the closeAllTerminals method to log the count
  closeAllTerminals() {
    console.log(`Closing all terminals (count: ${this.getActiveTerminalCount()})`);
    
    // Close all terminal instances
    Object.keys(this.terminals).forEach(id => {
      if (this.terminals[id] && this.terminals[id].ptyProcess) {
        try {
          console.log(`Killing terminal ${id} process`);
          this.terminals[id].ptyProcess.kill();
        } catch (error) {
          console.error(`Error killing terminal ${id}:`, error);
        }
        
        // Remove event listeners
        if (this.terminals[id].resizeHandler) {
          window.removeEventListener('resize', this.terminals[id].resizeHandler);
        }
      }
    });
    
    // Clear terminals object
    this.terminals = {};
  }
  
  setupEventListeners() {
    // New tab button
    document.getElementById('new-tab-btn').addEventListener('click', () => {
      this.createNewTab();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+T: New terminal tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.createNewTab();
      }
      
      // Ctrl+W: Close current terminal tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        this.closeTab(this.activeTerminalId);
      }
    });
    
    // Add window beforeunload event listener to clean up terminals
    window.addEventListener('beforeunload', () => {
      this.closeAllTerminals();
    });
  }
}

// Initialize terminal manager when DOM is loaded
window.addEventListener('load', () => {
  // Make sure xterm.js and its addons are loaded
  if (typeof Terminal === 'undefined' || typeof FitAddon === 'undefined' || typeof WebLinksAddon === 'undefined') {
    console.error('Terminal or addons not loaded. Make sure to include xterm.js and its addons in your HTML.');
    return;
  }
  
  window.terminalManager = new TerminalManager();
});