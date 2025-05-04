import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

export interface VideoCompressorOptions {
  crf?: number;           // Constant Rate Factor (quality): 0-51, lower is better quality
  preset?: string;        // Compression preset: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
  inputDir?: string;
  outputDir?: string;
  clearOutputDir?: boolean;
}

export class VideoCompressor {
  private crf: number;
  private preset: string;
  private inputDir: string;
  private outputDir: string;
  private clearOutputDir: boolean;
  private processedFiles: Set<string> = new Set();
  private compressedVideos: number = 0;
  private skippedFiles: number = 0;
  private copiedFiles: number = 0;
  private errorFiles: number = 0;
  private originalTotalSize: number = 0;
  private finalTotalSize: number = 0;
  private debug: boolean = true;
  private progressCallback?: (progress: number, message: string) => void;
  private totalVideos: number = 0;
  private currentVideoIndex: number = 0;
  public ffmpegPath: string | null = ffmpegPath;

  constructor(options: VideoCompressorOptions = {}) {
    this.crf = options.crf ?? 23;  // Default CRF value (lower = better quality, higher = smaller size)
    this.preset = options.preset ?? 'medium';  // Default preset
    this.inputDir = options.inputDir ?? path.join(process.cwd(), 'input');
    this.outputDir = options.outputDir ?? path.join(process.cwd(), 'output');
    this.clearOutputDir = options.clearOutputDir ?? false;
  }

  private log = {
    info: (message: string) => {
      console.log(`${colors.cyan}${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), message);
    },
    success: (message: string) => {
      console.log(`${colors.green}${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), message);
    },
    warning: (message: string) => {
      console.log(`${colors.yellow}${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), message);
    },
    error: (message: string) => {
      console.error(`${colors.red}${colors.bold}ERROR: ${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), `ERROR: ${message}`);
    },
    header: (message: string) => {
      console.log(`\n${colors.bold}${colors.blue}${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), message);
    },
    detail: (message: string) => {
      console.log(`  ${colors.white}${message}${colors.reset}`);
    },
    progress: (message: string) => {
      process.stdout.write(`${colors.magenta}${message}${colors.reset}`);
      this.progressCallback?.(this.calculateProgress(), message.replace(/\r/g, ''));
    }
  };

  private calculateProgress(): number {
    if (this.totalVideos === 0) return 0;
    return Math.min(Math.round((this.currentVideoIndex / this.totalVideos) * 100), 99);
  }

  public setProgressCallback(callback: (progress: number, message: string) => void): void {
    this.progressCallback = callback;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isVideo(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'].includes(ext);
  }

  private async ensureOutputDirectory(directory: string): Promise<void> {
    if (!fs.existsSync(directory)) {
      await mkdir(directory, { recursive: true });
    }
  }

  private async clearDirectory(directory: string): Promise<void> {
    console.log(`[DEBUG] Attempting to clear directory: ${directory}`);
    console.log(`[DEBUG] this.clearOutputDir = ${this.clearOutputDir}`);
    
    if (!fs.existsSync(directory)) {
      console.log(`[DEBUG] Directory does not exist: ${directory}`);
      return;
    }
    
    try {
      const files = await readdir(directory);
      console.log(`[DEBUG] Files found in directory: ${files.length}`);
      
      for (const file of files) {
        if (file === '.gitkeep') {
          console.log(`[DEBUG] Skipping .gitkeep file`);
          continue; // Skip .gitkeep files
        }
        
        try {
          const filePath = path.join(directory, file);
          console.log(`[DEBUG] Processing file: ${filePath}`);
          
          try {
            const stats = await stat(filePath);
            
            if (stats.isDirectory()) {
              console.log(`[DEBUG] Clearing subdirectory: ${filePath}`);
              await this.clearDirectory(filePath);
              console.log(`[DEBUG] Removing subdirectory: ${filePath}`);
              try {
                fs.rmdirSync(filePath);
                console.log(`[DEBUG] Successfully removed subdirectory: ${filePath}`);
              } catch (err) {
                console.log(`[DEBUG] Error removing subdirectory: ${filePath}`, err);
                this.log.error(`Error removing subdirectory ${filePath}: ${err}`);
              }
            } else {
              console.log(`[DEBUG] Deleting file: ${filePath}`);
              try {
                fs.unlinkSync(filePath);
                console.log(`[DEBUG] Successfully deleted file: ${filePath}`);
              } catch (err) {
                console.log(`[DEBUG] Error deleting file: ${filePath}`, err);
                this.log.error(`Error deleting file ${filePath}: ${err}`);
              }
            }
          } catch (error) {
            console.log(`[DEBUG] Error getting stats for file ${filePath}: ${error}`);
            this.log.error(`Error getting stats for file ${filePath}: ${error}`);
          }
        } catch (error) {
          console.log(`[DEBUG] Error clearing file ${file}: ${error}`);
          this.log.error(`Error clearing file ${file}: ${error}`);
        }
      }
      
      this.log.info(`Cleared output directory: ${directory}`);
    } catch (error) {
      console.log(`[DEBUG] Error reading directory ${directory}: ${error}`);
      this.log.error(`Error reading directory ${directory}: ${error}`);
    }
  }

  private async compressVideo(filePath: string): Promise<void> {
    this.currentVideoIndex++;
    
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.inputDir, path.dirname(filePath));
    const outputDirPath = path.join(this.outputDir, relativePath);
    
    // Ensure output directory exists
    await this.ensureOutputDirectory(outputDirPath);
    
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const outputPath = path.join(outputDirPath, `${baseName}${ext}`);
    
    if (this.debug) {
      this.log.info(`Processing video file: ${filePath}`);
      this.log.detail(`Output path: ${outputPath}`);
    }
    
    // Get original file size
    const stats = await stat(filePath);
    this.originalTotalSize += stats.size;
    
    try {
      // Run ffmpeg to compress the video
      // -i: input file
      // -c:v libx264: use H.264 codec for video
      // -crf: constant rate factor (quality)
      // -preset: compression preset
      // -c:a aac: use AAC codec for audio
      // -b:a 128k: audio bitrate
      return new Promise<void>((resolve, reject) => {
        if (!this.ffmpegPath) {
          reject(new Error('FFmpeg binary not found'));
          return;
        }
        
        const ffmpeg = spawn(this.ffmpegPath, [
          '-i', filePath,
          '-c:v', 'libx264',
          '-crf', this.crf.toString(),
          '-preset', this.preset,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outputPath
        ]);
        
        let progressLine = '';
        
        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          // Extract progress information
          if (output.includes('time=')) {
            const match = output.match(/time=(\d+:\d+:\d+\.\d+)/);
            if (match && match[1]) {
              progressLine = `Compressing: ${match[1]}`;
              if (this.debug) {
                this.log.progress(`\r${progressLine}`);
              }
            }
          }
        });
        
        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            if (this.debug) {
              process.stdout.write('\r' + ' '.repeat(progressLine.length) + '\r');
            }
            
            // Get compressed file size
            const outputStats = await stat(outputPath);
            this.finalTotalSize += outputStats.size;
            
            const originalSize = this.formatBytes(stats.size);
            const compressedSize = this.formatBytes(outputStats.size);
            const savingsPercent = ((stats.size - outputStats.size) / stats.size * 100).toFixed(2);
            
            this.log.success(
              `Compressed: ${path.relative(this.inputDir, filePath)} ` +
              `(${originalSize} → ${compressedSize}, ${savingsPercent}% saved)`
            );
            
            this.compressedVideos++;
            resolve();
          } else {
            this.log.error(`Failed to compress ${filePath}`);
            this.errorFiles++;
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
        
        ffmpeg.on('error', (err) => {
          this.log.error(`Error compressing ${filePath}: ${err.message}`);
          this.errorFiles++;
          reject(err);
        });
      });
    } catch (error) {
      this.log.error(`Error compressing ${filePath}: ${error}`);
      this.errorFiles++;
    }
  }

  private async copyNonVideoFile(filePath: string): Promise<void> {
    try {
      // Calculate the relative path and create the output path
      const relativePath = path.relative(this.inputDir, path.dirname(filePath));
      const outputDirPath = path.join(this.outputDir, relativePath);
      const fileName = path.basename(filePath);
      const outputFilePath = path.join(outputDirPath, fileName);
      
      if (this.debug) {
        this.log.info(`Processing non-video file: ${filePath}`);
        this.log.detail(`Output path: ${outputFilePath}`);
      }
      
      // Ensure output directory exists
      await this.ensureOutputDirectory(outputDirPath);
      
      const originalSize = fs.statSync(filePath).size;
      this.originalTotalSize += originalSize;
      this.finalTotalSize += originalSize; // Same size as we're just copying
      
      // Copy the file using promisify
      await copyFile(filePath, outputFilePath);
      
      this.log.success(`Copied non-video file: ${filePath} to ${outputFilePath}`);
      this.copiedFiles++;
      this.processedFiles.add(filePath);
    } catch (error) {
      this.log.error(`Copying file ${filePath}: ${error}`);
      this.errorFiles++;
    }
  }

  private async processFile(filePath: string): Promise<void> {
    if (this.processedFiles.has(filePath)) {
      return;
    }
    
    if (this.isVideo(filePath)) {
      await this.compressVideo(filePath);
    } else {
      await this.copyNonVideoFile(filePath);
    }
    
    this.processedFiles.add(filePath);
  }

  private countVideos(files: string[]): number {
    return files.filter(file => this.isVideo(file)).length;
  }

  private async processDirectory(directory: string): Promise<void> {
    try {
      const files = await readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          await this.processDirectory(filePath);
        } else {
          await this.processFile(filePath);
        }
      }
    } catch (error) {
      this.log.error(`Error processing directory ${directory}: ${error}`);
    }
  }

  private getAllFilesFromDirectory(dirPath: string): string[] {
    let allFiles: string[] = [];
    
    const getAllFilesRecursive = (currentPath: string) => {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        
        if (fs.statSync(filePath).isDirectory()) {
          getAllFilesRecursive(filePath);
        } else {
          allFiles.push(filePath);
        }
      }
    };
    
    getAllFilesRecursive(dirPath);
    return allFiles;
  }

  public async compress(): Promise<any> {
    this.log.header('Starting video compression...');
    this.log.info(`Input directory: ${this.inputDir}`);
    this.log.info(`Output directory: ${this.outputDir}`);
    this.log.info(`CRF: ${this.crf}`);
    this.log.info(`Preset: ${this.preset}`);
    this.log.info(`Clear output directory: ${this.clearOutputDir ? 'Yes' : 'No'}`);
    console.log('[DEBUG] clearOutputDir value:', this.clearOutputDir, 'type:', typeof this.clearOutputDir);
    
    try {
      // Validate ffmpeg path
      if (!this.ffmpegPath) {
        throw new Error('FFmpeg binary not found. Make sure ffmpeg is installed and accessible.');
      }
      
      // Reset counters
      this.processedFiles.clear();
      this.compressedVideos = 0;
      this.skippedFiles = 0;
      this.copiedFiles = 0;
      this.errorFiles = 0;
      this.originalTotalSize = 0;
      this.finalTotalSize = 0;
      
      // Count total videos for progress tracking
      const allFiles = this.getAllFilesFromDirectory(this.inputDir);
      this.totalVideos = this.countVideos(allFiles);
      this.currentVideoIndex = 0;
      
      this.log.info(`Found ${this.totalVideos} video files to process`);
      this.progressCallback?.(0, `Found ${this.totalVideos} video files to process`);
      
      const startTime = Date.now();
      
      // Ensure output directory exists
      await this.ensureOutputDirectory(this.outputDir);
      
      // Clear output directory if requested
      if (this.clearOutputDir) {
        this.log.info(`Clearing output directory: ${this.outputDir}`);
        await this.clearDirectory(this.outputDir);
      } else {
        this.log.info(`Skipping clearing output directory (clearOutputDir is ${this.clearOutputDir})`);
      }
      
      await this.processDirectory(this.inputDir);
      
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      
      this.log.header('Compression Complete');
      this.log.info(`Processed ${this.compressedVideos} videos in ${processingTime} seconds`);
      
      if (this.copiedFiles > 0) {
        this.log.success(`Copied ${this.copiedFiles} non-video files`);
      }
      
      if (this.skippedFiles > 0) {
        this.log.warning(`Skipped ${this.skippedFiles} files`);
      }
      
      if (this.errorFiles > 0) {
        this.log.error(`Encountered errors in ${this.errorFiles} files`);
      }
      
      if (this.compressedVideos > 0) {
        const originalSize = this.formatBytes(this.originalTotalSize);
        const finalSize = this.formatBytes(this.finalTotalSize);
        const savingsPercent = ((this.originalTotalSize - this.finalTotalSize) / this.originalTotalSize * 100).toFixed(2);
        
        this.log.success(`Total size reduction: ${originalSize} → ${finalSize} (${savingsPercent}% saved)`);
      }
      
      this.progressCallback?.(100, 'Compression complete!');
      
      // Return result object
      return {
        compressedVideos: this.compressedVideos,
        skippedFiles: this.skippedFiles,
        copiedFiles: this.copiedFiles,
        errorFiles: this.errorFiles,
        originalTotalSize: this.originalTotalSize,
        finalTotalSize: this.finalTotalSize,
        processingTime
      };
    } catch (error) {
      this.log.error(`Error compressing videos: ${error}`);
      return null;
    }
  }
} 