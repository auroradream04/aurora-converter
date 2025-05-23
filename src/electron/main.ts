import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme, MessageBoxReturnValue } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import { ImageConverter } from '../image-converter';
import { VideoCompressor } from '../video-compressor';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Function to clear directory directly from main process
async function clearDirectory(directory: string): Promise<void> {
  console.log(`[MAIN] Clearing directory: ${directory}`);
  
  if (!fs.existsSync(directory)) {
    console.log(`[MAIN] Directory does not exist: ${directory}`);
    return;
  }
  
  try {
    const files = await readdir(directory);
    console.log(`[MAIN] Files found in directory: ${files.length}`);
    
    for (const file of files) {
      if (file === '.gitkeep') {
        console.log(`[MAIN] Skipping .gitkeep file`);
        continue; // Skip .gitkeep files
      }
      
      try {
        const filePath = path.join(directory, file);
        console.log(`[MAIN] Processing file: ${filePath}`);
        
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          console.log(`[MAIN] Clearing subdirectory: ${filePath}`);
          await clearDirectory(filePath);
          console.log(`[MAIN] Removing subdirectory: ${filePath}`);
          try {
            fs.rmdirSync(filePath);
            console.log(`[MAIN] Successfully removed subdirectory: ${filePath}`);
          } catch (err) {
            console.log(`[MAIN] Error removing subdirectory: ${filePath}`, err);
          }
        } else {
          console.log(`[MAIN] Deleting file: ${filePath}`);
          try {
            fs.unlinkSync(filePath);
            console.log(`[MAIN] Successfully deleted file: ${filePath}`);
          } catch (err) {
            console.log(`[MAIN] Error deleting file: ${filePath}`, err);
          }
        }
      } catch (error) {
        console.log(`[MAIN] Error processing file ${file}: ${error}`);
      }
    }
    
    console.log(`[MAIN] Cleared directory: ${directory}`);
  } catch (error) {
    console.log(`[MAIN] Error reading directory: ${directory}`, error);
  }
}

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

// Add a direct directory clearing function with synchronous operations
function clearDirectorySync(directory: string): boolean {
  console.log(`[MAIN] Force clearing directory: ${directory}`);
  
  if (!fs.existsSync(directory)) {
    console.log(`[MAIN] Directory does not exist: ${directory}`);
    try {
      // Create the directory if it doesn't exist
      fs.mkdirSync(directory, { recursive: true });
      console.log(`[MAIN] Created directory: ${directory}`);
      return true;
    } catch (error) {
      console.error(`[MAIN] Error creating directory ${directory}:`, error);
      return false;
    }
  }
  
  try {
    // Get all files in the directory
    const files = fs.readdirSync(directory);
    console.log(`[MAIN] Files found in directory: ${files.length}`);
    
    // Process each file/directory
    for (const file of files) {
      if (file === '.gitkeep') {
        console.log(`[MAIN] Skipping .gitkeep file`);
        continue; // Skip .gitkeep files
      }
      
      const filePath = path.join(directory, file);
      console.log(`[MAIN] Processing: ${filePath}`);
      
      try {
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          // Recursively clear subdirectory
          clearDirectorySync(filePath);
          
          // Then remove the empty directory
          console.log(`[MAIN] Removing directory: ${filePath}`);
          try {
            fs.rmdirSync(filePath, { recursive: true, force: true } as any);
            console.log(`[MAIN] Successfully removed directory: ${filePath}`);
          } catch (error) {
            console.error(`[MAIN] Error removing directory ${filePath}:`, error);
            // Continue anyway
          }
        } else {
          // Remove file
          console.log(`[MAIN] Removing file: ${filePath}`);
          try {
            fs.unlinkSync(filePath);
            console.log(`[MAIN] Successfully removed file: ${filePath}`);
          } catch (error) {
            console.error(`[MAIN] Error removing file ${filePath}:`, error);
            // Try with fs.rmSync if available (Node.js 14.14.0+)
            try {
              (fs as any).rmSync(filePath, { force: true });
              console.log(`[MAIN] Successfully removed file with rmSync: ${filePath}`);
            } catch (rmError) {
              console.error(`[MAIN] Error removing file with rmSync ${filePath}:`, rmError);
              // Continue anyway
            }
          }
        }
      } catch (error) {
        console.error(`[MAIN] Error processing ${filePath}:`, error);
        // Continue with other files
      }
    }
    
    console.log(`[MAIN] Successfully cleared directory: ${directory}`);
    return true;
  } catch (error) {
    console.error(`[MAIN] Error clearing directory ${directory}:`, error);
    return false;
  }
}

// Add a new IPC handler specifically for clearing directories
ipcMain.handle('clear-directory', async (_, dirPath: string) => {
  console.log(`[MAIN] Received request to clear directory: ${dirPath}`);
  
  try {
    // First ensure the directory exists
    if (!fs.existsSync(dirPath)) {
      console.log(`[MAIN] Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Then try to clear it
    const success = clearDirectorySync(dirPath);
    
    // Double-check the directory exists after clearing
    if (!fs.existsSync(dirPath)) {
      console.log(`[MAIN] Directory doesn't exist after clearing, recreating: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    return success;
  } catch (error) {
    console.error(`[MAIN] Unexpected error in clear-directory handler:`, error);
    
    // Try to create the directory as a last resort
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[MAIN] Created directory as fallback: ${dirPath}`);
      }
    } catch (createError) {
      console.error(`[MAIN] Failed to create directory as fallback:`, createError);
    }
    
    return false;
  }
});

// Convert images
ipcMain.handle('convert-images', async (_, options) => {
  try {
    console.log('Convert Images Options:', {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutput: options.clearOutput,
      quality: options.quality,
      maxWidth: options.maxWidth
    });
    
    // NOTE: We don't clear the directory here anymore - the renderer will call 'clear-directory' directly
    
    const converter = new ImageConverter({
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutputDir: false, // Always false, we clear directory separately
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
    console.log('Compress Videos Options:', {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutput: options.clearOutput,
      crf: options.crf,
      preset: options.preset
    });
    
    // NOTE: We don't clear the directory here anymore - the renderer will call 'clear-directory' directly
    
    const compressor = new VideoCompressor({
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      clearOutputDir: false, // Always false, we clear directory separately
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

// Check if directory has files
ipcMain.handle('check-directory-has-files', async (_, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      // Directory doesn't exist, so we'll create it later
      return false;
    }
    
    const files = fs.readdirSync(dirPath);
    return files.length > 0;
  } catch (error) {
    console.error('Error checking directory:', error);
    return false;
  }
});

// Show confirmation dialog
ipcMain.handle('show-confirm-dialog', (_, options: { title: string, message: string }) => {
  if (!mainWindow) return Promise.resolve(false);
  
  return new Promise<boolean>((resolve) => {
    dialog.showMessageBox(
      mainWindow!,
      {
        type: 'warning',
        title: options.title,
        message: options.message,
        buttons: ['Cancel', 'Continue'],
        defaultId: 0,
        cancelId: 0
      },
      (buttonIndex) => {
        // Return true if the user clicked "Continue" (index 1)
        resolve(buttonIndex === 1);
      }
    );
  });
});

ipcMain.handle('select-file', async (_, fileType: string) => {
  if (!mainWindow) return null;
  const filters = fileType === 'mp4' ? [{ name: 'MP4 Video', extensions: ['mp4'] }] : [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters
  }) as unknown as { canceled: boolean; filePaths: string[] };
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

const ffmpegPath = require('ffmpeg-static');
ipcMain.handle('convert-to-hls', async (_, options: { inputDir: string; outputDir: string; segmentDuration: number }) => {
  const { inputDir, outputDir, segmentDuration } = options;
  if (!inputDir || !outputDir) throw new Error('Input and output directories are required');
  const path = require('path');
  const fs = require('fs');
  const { exec } = require('child_process');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Find all .mp4 files in inputDir (non-recursive)
  const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.mp4'));
  let converted = 0;
  for (const file of files) {
    const baseName = path.basename(file, path.extname(file));
    const inputFile = path.join(inputDir, file);
    const outFolder = path.join(outputDir, baseName);
    if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });
    const outputPlaylist = path.join(outFolder, 'output.m3u8');
    const thumbnailPath = path.join(outFolder, 'thumbnail.webp');

    // First, generate the thumbnail
    const thumbnailCmd = `"${ffmpegPath}" -i "${inputFile}" -vframes 1 -vf "scale=320:-1" -c:v libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset picture -an -vsync 0 "${thumbnailPath}"`;
    
    try {
      // Generate thumbnail
      await new Promise((resolve, reject) => {
        exec(thumbnailCmd, (error, stdout, stderr) => {
          if (error) {
            console.error('Error generating thumbnail:', error);
            reject(error);
          } else {
            resolve(true);
          }
        });
      });

      // Then convert to HLS
      const hlsCmd = `"${ffmpegPath}" -i "${inputFile}" -codec: copy -start_number 0 -hls_time ${segmentDuration} -hls_list_size 0 -f hls "${outputPlaylist}"`;
      await new Promise((resolve, reject) => {
        exec(hlsCmd, (error, stdout, stderr) => {
          if (error) {
            console.error('Error running ffmpeg for HLS:', error);
            reject(error);
          } else {
            resolve(true);
          }
        });
      });
      converted++;
    } catch (e) {
      // Log error but continue with next file
      console.error(`Failed to convert ${file}:`, e);
    }
  }
  return { converted };
}); 