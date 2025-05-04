import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import { ImageConverter } from '../image-converter';
import { VideoCompressor } from '../video-compressor';

// Simple settings storage
class Settings {
  private filePath: string;
  private data: any;
  
  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
    this.data = this.loadSettings();
  }
  
  private loadSettings(): any {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    // Default settings
    return {
      windowBounds: { width: 1200, height: 800 },
      darkMode: true,
      lastInputDir: app.getPath('documents'),
      lastOutputDir: app.getPath('documents')
    };
  }
  
  public save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  public get(key: string): any {
    return this.data[key];
  }
  
  public set(key: string, value: any): void {
    this.data[key] = value;
    this.save();
  }
}

// Initialize settings
const settings = new Settings();

// Keep a global reference of the window object to avoid GC
let mainWindow: BrowserWindow | null = null;

// Platform-specific ffmpeg path handling
function getFFmpegPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg');
  }
  // Use the ffmpeg-static path in development
  return require('ffmpeg-static');
}

function createWindow() {
  // Use saved window dimensions
  const windowBounds = settings.get('windowBounds') as { width: number, height: number };
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until loaded
    backgroundColor: '#1e1e1e', // Dark background color
    icon: path.join(__dirname, '../../assets/icons', 
      process.platform === 'darwin' ? 'mac/icon.icns' : 'win/icon.ico')
  });

  // Force dark mode based on settings
  nativeTheme.themeSource = settings.get('darkMode') ? 'dark' : 'system';

  // Load the index.html
  if (app.isPackaged) {
    // Production mode - load from asar
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../renderer/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  } else {
    // Development mode - load from file system
    mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));
  }

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window size when resized
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const { width, height } = mainWindow.getBounds();
      settings.set('windowBounds', { width, height });
    }
  });

  // Clear reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createAppMenu();
}

function createAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Select Input Directory',
          click: () => selectDirectory('input')
        },
        {
          label: 'Select Output Directory',
          click: () => selectDirectory('output')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          role: 'quit'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dark Mode',
          type: 'checkbox',
          checked: settings.get('darkMode') as boolean,
          click: (menuItem) => {
            settings.set('darkMode', menuItem.checked);
            nativeTheme.themeSource = menuItem.checked ? 'dark' : 'system';
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Aurora Converter',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              title: 'About Aurora Converter',
              message: 'Aurora Converter v' + app.getVersion(),
              detail: 'A desktop utility for image conversion and video compression.\n\n' +
                'Created with Electron, Sharp, and FFmpeg.',
              buttons: ['OK'],
              icon: path.join(__dirname, '../../assets/icons', 
                process.platform === 'darwin' ? 'mac/icon.icns' : 'win/icon.ico')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Select directory and notify renderer
async function selectDirectory(type: 'input' | 'output') {
  if (!mainWindow) return;

  const defaultPath = type === 'input' 
    ? settings.get('lastInputDir') as string
    : settings.get('lastOutputDir') as string;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath
  }) as unknown as { canceled: boolean; filePaths: string[] };

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    
    // Store the last selected directory
    if (type === 'input') {
      settings.set('lastInputDir', selectedPath);
    } else {
      settings.set('lastOutputDir', selectedPath);
    }
    
    // Send the selected path to the renderer
    mainWindow.webContents.send('directory-selected', { type, path: selectedPath });
  }
}

// App initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Communication
ipcMain.handle('select-directory', async (_, type: 'input' | 'output') => {
  if (!mainWindow) return null;

  const defaultPath = type === 'input' 
    ? settings.get('lastInputDir') as string
    : settings.get('lastOutputDir') as string;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath
  }) as unknown as { canceled: boolean; filePaths: string[] };

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    
    // Store the last selected directory
    if (type === 'input') {
      settings.set('lastInputDir', selectedPath);
    } else {
      settings.set('lastOutputDir', selectedPath);
    }
    
    return selectedPath;
  }
  
  return null;
});

// Convert images
ipcMain.handle('convert-images', async (_, options) => {
  try {
    const converter = new ImageConverter({
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutputDir: options.clearOutput,
      quality: options.quality,
      maxWidth: options.maxWidth
    });

    // Create a channel for progress updates
    const progressCallback = (progress: number, message: string) => {
      if (mainWindow) {
        mainWindow.webContents.send('conversion-progress', { progress, message });
      }
    };

    // Add a progress callback to the converter
    converter.setProgressCallback(progressCallback);

    const result = await converter.convert();
    return result;
  } catch (error) {
    console.error('Error in image conversion:', error);
    throw error;
  }
});

// Compress videos
ipcMain.handle('compress-videos', async (_, options) => {
  try {
    const compressor = new VideoCompressor({
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutputDir: options.clearOutput,
      crf: options.crf,
      preset: options.preset
    });

    // Override ffmpeg path for packaged app
    if (app.isPackaged) {
      compressor.ffmpegPath = getFFmpegPath();
    }

    // Create a channel for progress updates
    const progressCallback = (progress: number, message: string) => {
      if (mainWindow) {
        mainWindow.webContents.send('conversion-progress', { progress, message });
      }
    };

    // Add a progress callback to the compressor
    compressor.setProgressCallback(progressCallback);

    const result = await compressor.compress();
    return result;
  } catch (error) {
    console.error('Error in video compression:', error);
    throw error;
  }
});

// Get app settings
ipcMain.handle('get-settings', () => {
  return {
    darkMode: settings.get('darkMode'),
    lastInputDir: settings.get('lastInputDir'),
    lastOutputDir: settings.get('lastOutputDir')
  };
});

// Get app path for default directories
ipcMain.handle('get-app-path', () => {
  const appPath = app.isPackaged 
    ? path.dirname(app.getPath('exe'))
    : path.resolve('./');
  return appPath;
});

// Open folder in explorer/finder
ipcMain.handle('open-explorer', async (_, folderPath: string) => {
  try {
    // Open folder in the default file explorer
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    const { exec } = require('child_process');
    
    return new Promise<boolean>((resolve) => {
      exec(`${command} "${folderPath}"`, (error: any) => {
        if (error) {
          console.error('Error opening folder:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error opening folder:', error);
    return false;
  }
}); 