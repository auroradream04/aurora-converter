import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

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
  private errorFiles: number = 0;
  private originalTotalSize: number = 0;
  private finalTotalSize: number = 0;
  private debug: boolean = true;

  constructor(options: VideoCompressorOptions = {}) {
    this.crf = options.crf ?? 23;  // Default CRF value (lower = better quality, higher = smaller size)
    this.preset = options.preset ?? 'medium';  // Default preset
    this.inputDir = options.inputDir ?? path.join(process.cwd(), 'input');
    this.outputDir = options.outputDir ?? path.join(process.cwd(), 'output');
    this.clearOutputDir = options.clearOutputDir ?? false;
  }

  private log = {
    info: (message: string) => console.log(`${colors.cyan}${message}${colors.reset}`),
    success: (message: string) => console.log(`${colors.green}${message}${colors.reset}`),
    warning: (message: string) => console.log(`${colors.yellow}${message}${colors.reset}`),
    error: (message: string) => console.error(`${colors.red}${colors.bold}ERROR: ${message}${colors.reset}`),
    header: (message: string) => console.log(`\n${colors.bold}${colors.blue}${message}${colors.reset}`),
    detail: (message: string) => console.log(`  ${colors.white}${message}${colors.reset}`),
    progress: (message: string) => process.stdout.write(`${colors.magenta}${message}${colors.reset}`)
  };

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
    if (this.clearOutputDir && fs.existsSync(directory)) {
      const files = await readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          await this.clearDirectory(filePath);
          fs.rmdirSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      
      this.log.info(`Cleared output directory: ${directory}`);
    }
  }

  private async compressVideo(filePath: string): Promise<void> {
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
        const ffmpeg = spawn(ffmpegPath as string, [
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
    this.log.warning(`Skipping non-video file: ${filePath}`);
    this.skippedFiles++;
    this.processedFiles.add(filePath);
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

  public async compress(): Promise<void> {
    if (!fs.existsSync(this.inputDir)) {
      this.log.error(`Input directory does not exist: ${this.inputDir}`);
      return;
    }
    
    if (!ffmpegPath) {
      this.log.error('FFmpeg binary not found. Please make sure ffmpeg-static is properly installed.');
      return;
    }
    
    this.log.header('Starting Video Compression');
    this.log.info(`Input Directory: ${this.inputDir}`);
    this.log.info(`Output Directory: ${this.outputDir}`);
    this.log.info(`Compression Settings: CRF ${this.crf}, Preset: ${this.preset}`);
    
    // Clear output directory if requested
    await this.clearDirectory(this.outputDir);
    
    // Create output directory if it doesn't exist
    await this.ensureOutputDirectory(this.outputDir);
    
    const startTime = Date.now();
    
    // Process all files in the input directory
    await this.processDirectory(this.inputDir);
    
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    this.log.header('Compression Complete');
    this.log.info(`Processed ${this.compressedVideos} videos in ${processingTime} seconds`);
    
    if (this.skippedFiles > 0) {
      this.log.warning(`Skipped ${this.skippedFiles} non-video files`);
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
  }
} 