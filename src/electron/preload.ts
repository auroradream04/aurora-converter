import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Directory selection
    selectDirectory: (type: 'input' | 'output') => ipcRenderer.invoke('select-directory', type),
    
    // Check if directory has files
    checkDirectoryHasFiles: (dirPath: string) => ipcRenderer.invoke('check-directory-has-files', dirPath),
    
    // Show confirmation dialog
    showConfirmDialog: (title: string, message: string) => ipcRenderer.invoke('show-confirm-dialog', { title, message }),
    
    // Directly clear a directory
    clearDirectory: (dirPath: string) => {
      console.log('[PRELOAD] Requesting to clear directory:', dirPath);
      return ipcRenderer.invoke('clear-directory', dirPath);
    },
    
    // Image conversion
    convertImages: (options: {
      inputDir: string;
      outputDir: string;
      clearOutput: boolean;
      quality: number;
      maxWidth: number;
    }) => {
      console.log('[PRELOAD] convertImages called with options:', options);
      console.log('[PRELOAD] clearOutput:', options.clearOutput, 'type:', typeof options.clearOutput);
      return ipcRenderer.invoke('convert-images', options);
    },
    
    // Video compression
    compressVideos: (options: {
      inputDir: string;
      outputDir: string;
      clearOutput: boolean;
      crf: number;
      preset: string;
    }) => {
      console.log('[PRELOAD] compressVideos called with options:', options);
      console.log('[PRELOAD] clearOutput:', options.clearOutput, 'type:', typeof options.clearOutput);
      return ipcRenderer.invoke('compress-videos', options);
    },
    
    // Get settings from main process
    getSettings: () => ipcRenderer.invoke('get-settings'),
    
    // Get app path for default directories
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Open folder in explorer/finder
    openExplorer: (path: string) => ipcRenderer.invoke('open-explorer', path),
    
    // Select a file (for HLS input)
    selectFile: (fileType: string) => ipcRenderer.invoke('select-file', fileType),
    
    // Convert MP4 to HLS (batch)
    convertToHLS: (options: { inputDir: string; outputDir: string; segmentDuration: number }) => ipcRenderer.invoke('convert-to-hls', options),
    
    // Listen for directory selection from menu
    onDirectorySelected: (callback: (data: { type: string, path: string }) => void) => {
      const subscription = (_event: any, data: { type: string, path: string }) => callback(data);
      ipcRenderer.on('directory-selected', subscription);
      
      // Return a function to remove the event listener
      return () => {
        ipcRenderer.removeListener('directory-selected', subscription);
      };
    },
    
    // Listen for progress updates
    onProgressUpdate: (callback: (data: { progress: number, message: string }) => void) => {
      const subscription = (_event: any, data: { progress: number, message: string }) => callback(data);
      ipcRenderer.on('conversion-progress', subscription);
      
      // Return a function to remove the event listener
      return () => {
        ipcRenderer.removeListener('conversion-progress', subscription);
      };
    }
  }
); 