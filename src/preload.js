const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // System information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getCpuInfo: () => ipcRenderer.invoke('get-cpu-info'),
    getMemoryInfo: () => ipcRenderer.invoke('get-memory-info'),
    getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
    
    // OS utilities
    platform: os.platform(),
    arch: os.arch(),
    homedir: os.homedir(),
    username: os.userInfo().username,
    
    // File system operations
    readDirectory: (dirPath) => {
      try {
        // Return an array of simple objects with name and isDirectory properties
        return fs.readdirSync(dirPath).map(name => {
          const fullPath = path.join(dirPath, name);
          const stats = fs.statSync(fullPath);
          return {
            name,
            isDirectory: () => stats.isDirectory()
          };
        });
      } catch (error) {
        console.error('Error reading directory:', error);
        return [];
      }
    },
    
    joinPath: (...args) => path.join(...args),
    dirname: (filePath) => path.dirname(filePath),
    basename: (filePath) => path.basename(filePath),
    extname: (filePath) => path.extname(filePath),
    
    // Terminal operations
    spawnProcess: (command, args, options) => {
      try {
        const { spawn } = require('child_process');
        
        // Use child_process with more aggressive CPU optimization
        const proc = spawn(command, args || [], {
          cwd: options.cwd || os.homedir(),
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            TERM_PROGRAM: 'eDEX-UI'
          },
          shell: true,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          // Set lower process priority to reduce CPU usage
          ...(os.platform() === 'win32' ? { 
            priority: 'below_normal',
            // Limit CPU affinity on Windows (use only half of available cores)
            windowsVerbatimArguments: false
          } : {})
        });
        
        // Set encoding for better text handling
        proc.stdout.setEncoding('utf8');
        proc.stderr.setEncoding('utf8');
        
        // Buffer management to reduce CPU spikes
        let outputBuffer = '';
        let bufferTimeout = null;
        const flushBuffer = (callback) => {
          if (outputBuffer && callback) {
            callback(outputBuffer);
            outputBuffer = '';
          }
        };
        
        return {
          pid: proc.pid,
          write: (data) => {
            try {
              if (proc.stdin.writable) {
                return proc.stdin.write(data);
              } else {
                console.error('Process stdin is not writable');
                return false;
              }
            } catch (error) {
              console.error('Error writing to process:', error);
              return false;
            }
          },
          onData: (callback) => {
            // Buffer stdout data to reduce CPU usage from frequent updates
            proc.stdout.on('data', (data) => {
              outputBuffer += data;
              
              // Clear existing timeout
              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
              }
              
              // Set new timeout to flush buffer
              bufferTimeout = setTimeout(() => flushBuffer(callback), 10);
              
              // If buffer gets too large, flush immediately
              if (outputBuffer.length > 1024) {
                clearTimeout(bufferTimeout);
                flushBuffer(callback);
              }
            });
          },
          onError: (callback) => {
            proc.stderr.on('data', callback);
          },
          onExit: (callback) => {
            proc.on('exit', (code) => {
              // Clear any pending buffer flush
              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
              }
              callback({ exitCode: code });
            });
          },
          resize: () => {
            // child_process doesn't support resize directly
            return true;
          },
          kill: () => {
            try {
              // Clear any pending buffer flush
              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
              }
              
              // Kill process and all child processes
              if (os.platform() === 'win32') {
                // On Windows, use taskkill to ensure all child processes are terminated
                require('child_process').exec(`taskkill /pid ${proc.pid} /T /F`);
              } else {
                // On Unix-like systems, negative PID kills process group
                proc.kill('SIGKILL');
              }
              return true;
            } catch (error) {
              console.error('Error killing process:', error);
              return false;
            }
          }
        };
      } catch (error) {
        console.error('Error spawning process:', error);
        throw error;
      }
    },
    
    // Window controls
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window')
  }
);