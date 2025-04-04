class FileExplorer {
  constructor() {
    this.currentPath = window.api ? window.api.homedir : '/';
    this.fileTreeElement = document.getElementById('file-tree');
    
    this.initFileExplorer();
    this.setupEventListeners();
  }
  
  initFileExplorer() {
    this.loadDirectory(this.currentPath);
  }
  
  loadDirectory(dirPath) {
    if (!window.api) return;
    
    this.currentPath = dirPath;
    this.fileTreeElement.innerHTML = '';
    
    // Add parent directory option if not at root
    if (dirPath !== window.api.dirname(dirPath)) {
      const parentItem = document.createElement('div');
      parentItem.className = 'file-item directory';
      parentItem.innerHTML = '<span>📁 ..</span>';
      parentItem.addEventListener('click', () => {
        this.loadDirectory(window.api.dirname(dirPath));
      });
      this.fileTreeElement.appendChild(parentItem);
    }
    
    try {
      // Read directory contents
      const items = window.api.readDirectory(dirPath);
      
      if (!Array.isArray(items)) {
        throw new Error('Directory contents is not an array');
      }
      
      // Create file items directly without sorting
      items.forEach(item => {
        // Check if item is a valid object with name property
        if (!item || typeof item !== 'object' || !item.name) {
          console.warn('Invalid directory entry:', item);
          return;
        }
        
        const itemPath = window.api.joinPath(dirPath, item.name);
        const fileItem = document.createElement('div');
        
        // Check if we can determine if it's a directory
        const isDirectory = item.isDirectory ? item.isDirectory() : false;
        
        if (isDirectory) {
          fileItem.className = 'file-item directory';
          fileItem.innerHTML = `<span>📁 ${item.name}</span>`;
          fileItem.addEventListener('click', () => {
            this.loadDirectory(itemPath);
          });
        } else {
          fileItem.className = 'file-item file';
          
          // Determine icon based on file extension
          const ext = window.api.extname(item.name).toLowerCase();
          let icon = '📄';
          
          if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
            icon = '🖼️';
          } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
            icon = '🎵';
          } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
            icon = '🎬';
          } else if (['.pdf'].includes(ext)) {
            icon = '📕';
          } else if (['.doc', '.docx', '.txt', '.md'].includes(ext)) {
            icon = '📝';
          } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
            icon = '🗜️';
          } else if (['.exe', '.bat', '.cmd'].includes(ext)) {
            icon = '⚙️';
          } else if (['.js', '.py', '.java', '.c', '.cpp', '.html', '.css'].includes(ext)) {
            icon = '👨‍💻';
          }
          
          fileItem.innerHTML = `<span>${icon} ${item.name}</span>`;
        }
        
        this.fileTreeElement.appendChild(fileItem);
      });
    } catch (error) {
      console.error('Error reading directory:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'file-item error';
      errorItem.textContent = `Error: ${error.message}`;
      this.fileTreeElement.appendChild(errorItem);
    }
    
    // Update current path in status bar
    document.getElementById('current-path').textContent = this.currentPath;
  }
  
  setupEventListeners() {
    // Add refresh method
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        this.refresh();
      }
    });
  }
  
  // Method to refresh the current directory
  refresh() {
    this.loadDirectory(this.currentPath);
  }
}

// Initialize file explorer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.fileExplorer = new FileExplorer();
});