class SystemMonitor {
  constructor() {
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    this.networkStats = { rx_sec: 0, tx_sec: 0 };
    this.systemInfo = {};
    
    this.initSystemInfo();
    this.startMonitoring();
    this.updateClock();
  }
  
  async initSystemInfo() {
    try {
      if (window.api) {
        // Get initial system information
        this.systemInfo = await window.api.getSystemInfo();
        
        // Update hostname
        document.querySelector('.hostname').textContent = this.systemInfo.hostname;
        
        // Update uptime initially
        this.updateUptime();
      }
    } catch (error) {
      console.error('Error initializing system info:', error);
    }
  }
  
  startMonitoring() {
    if (!window.api) return;
    
    // Update CPU usage every second
    setInterval(async () => {
      try {
        const cpuInfo = await window.api.getCpuInfo();
        // Make sure we're using the correct property for CPU load
        this.cpuUsage = cpuInfo.currentLoad || 0;
        // Remove console.log to prevent spam
        this.updateCPUInfo(cpuInfo);
      } catch (error) {
        // Only log actual errors
        console.error('Error updating CPU info:', error);
      }
    }, 1000);
    
    // Update memory usage every second
    setInterval(async () => {
      try {
        const memInfo = await window.api.getMemoryInfo();
        this.memoryUsage = (memInfo.total - memInfo.available) / memInfo.total * 100;
        this.updateMemoryInfo(memInfo);
      } catch (error) {
        console.error('Error updating memory info:', error);
      }
    }, 1000);
    
    // Update network stats every second
    setInterval(async () => {
      try {
        const networkInfo = await window.api.getNetworkInfo();
        if (networkInfo && networkInfo.length > 0) {
          this.networkStats = networkInfo[0];
          this.updateNetworkInfo();
        }
      } catch (error) {
        console.error('Error updating network info:', error);
      }
    }, 1000);
    
    // Update uptime every minute
    setInterval(() => {
      this.updateUptime();
    }, 60000);
  }
  
  updateCPUInfo(cpuInfo) {
    const cpuBar = document.getElementById('cpu-bar');
    const cpuPercentage = document.getElementById('cpu-percentage');
    const cpuDetails = document.getElementById('cpu-details');
    
    if (!cpuBar || !cpuPercentage || !cpuDetails) return;
    
    // Make sure we have a valid usage value
    const usage = this.cpuUsage || 0;
    
    cpuBar.style.width = `${usage}%`;
    cpuPercentage.textContent = `${Math.round(usage)}%`;
    
    // Change color based on usage
    if (usage > 80) {
      cpuBar.style.backgroundColor = '#ff5555';
    } else if (usage > 60) {
      cpuBar.style.backgroundColor = '#f1fa8c';
    } else {
      cpuBar.style.backgroundColor = '#50fa7b';
    }
    
    // Update CPU details if available
    if (cpuInfo) {
      const cpuName = cpuInfo.brand || cpuInfo.manufacturer + ' ' + cpuInfo.model || 'CPU';
      const cores = cpuInfo.cores || this.systemInfo.cpus?.length || 'N/A';
      cpuDetails.textContent = `${cpuName} (${cores} cores)`;
    }
  }
  
  updateMemoryInfo(memInfo) {
    const memoryBar = document.getElementById('memory-bar');
    const memoryPercentage = document.getElementById('memory-percentage');
    const memoryDetails = document.getElementById('memory-details');
    
    memoryBar.style.width = `${this.memoryUsage}%`;
    memoryPercentage.textContent = `${Math.round(this.memoryUsage)}%`;
    
    // Change color based on usage
    if (this.memoryUsage > 80) {
      memoryBar.style.backgroundColor = '#ff5555';
    } else if (this.memoryUsage > 60) {
      memoryBar.style.backgroundColor = '#f1fa8c';
    } else {
      memoryBar.style.backgroundColor = '#50fa7b';
    }
    
    if (memInfo) {
      const totalGB = (memInfo.total / (1024 * 1024 * 1024)).toFixed(2);
      const usedGB = ((memInfo.total - memInfo.available) / (1024 * 1024 * 1024)).toFixed(2);
      memoryDetails.textContent = `${usedGB} GB / ${totalGB} GB`;
    }
  }
  
  updateNetworkInfo() {
    const networkDetails = document.getElementById('network-details');
    
    if (this.networkStats) {
      const rxMB = (this.networkStats.rx_sec / (1024 * 1024)).toFixed(2);
      const txMB = (this.networkStats.tx_sec / (1024 * 1024)).toFixed(2);
      networkDetails.textContent = `↓ ${rxMB} MB/s | ↑ ${txMB} MB/s`;
    }
  }
  
  updateUptime() {
    const uptimeElement = document.getElementById('uptime');
    
    if (this.systemInfo.uptime) {
      const uptime = this.systemInfo.uptime;
      const days = Math.floor(uptime / (24 * 60 * 60));
      const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((uptime % (60 * 60)) / 60);
      
      let uptimeText = '';
      if (days > 0) uptimeText += `${days}d `;
      if (hours > 0) uptimeText += `${hours}h `;
      uptimeText += `${minutes}m`;
      
      uptimeElement.textContent = `Uptime: ${uptimeText}`;
    }
  }
  
  updateClock() {
    const datetimeElement = document.querySelector('.datetime');
    
    const updateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      datetimeElement.textContent = now.toLocaleDateString('en-US', options);
    };
    
    updateTime();
    setInterval(updateTime, 1000);
  }
}

// Initialize system monitor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.systemMonitor = new SystemMonitor();
});