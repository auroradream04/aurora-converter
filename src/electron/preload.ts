import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Directory selection
    selectDirectory: (type: 'input' | 'output') => ipcRenderer.invoke('select-directory', type),
    
    // Image conversion
    convertImages: (options: {
      inputDir: string;
      outputDir: string;
      clearOutput: boolean;
      quality: number;
      maxWidth: number;
    }) => ipcRenderer.invoke('convert-images', options),
    
    // Video compression
    compressVideos: (options: {
      inputDir: string;
      outputDir: string;
      clearOutput: boolean;
      crf: number;
      preset: string;
    }) => ipcRenderer.invoke('compress-videos', options),
    
    // Get settings from main process
    getSettings: () => ipcRenderer.invoke('get-settings'),
    
    // Get app path for default directories
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Open folder in explorer/finder
    openExplorer: (path: string) => ipcRenderer.invoke('open-explorer', path),
    
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