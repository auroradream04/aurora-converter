import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

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

export interface ConverterOptions {
  quality?: number;
  maxWidth?: number;
  inputDir?: string;
  outputDir?: string;
  clearOutputDir?: boolean;
}

export class ImageConverter {
  private quality: number;
  private maxWidth: number;
  private inputDir: string;
  private outputDir: string;
  private clearOutputDir: boolean;
  private processedFiles: Set<string> = new Set();
  private convertedImages: number = 0;
  private copiedFiles: number = 0;
  private skippedFiles: number = 0;
  private errorFiles: number = 0;
  private existingWebpPreferred: number = 0;
  private originalTotalSize: number = 0;
  private finalTotalSize: number = 0;
  private filesMap: Map<string, Set<string>> = new Map();
  private debug: boolean = true;
  private progressCallback?: (progress: number, message: string) => void;
  private totalImages: number = 0;
  private currentImageIndex: number = 0;

  constructor(options: ConverterOptions = {}) {
    this.quality = options.quality ?? 80;
    this.maxWidth = options.maxWidth ?? 1920;
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
    }
  };

  private calculateProgress(): number {
    if (this.totalImages === 0) return 0;
    return Math.min(Math.round((this.currentImageIndex / this.totalImages) * 100), 99);
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

  private isImage(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  }

  private isWebP(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ext === '.webp';
  }

  private getBaseName(filePath: string): string {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName);
    return path.basename(fileName, ext);
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

  private indexFiles(directory: string): void {
    const files: string[] = [];
    this.collectFiles(directory, files);
    
    // Group files by their base names
    for (const file of files) {
      const relativePath = path.relative(this.inputDir, path.dirname(file));
      const baseName = this.getBaseName(file);
      const key = path.join(relativePath, baseName).toLowerCase();
      
      if (!this.filesMap.has(key)) {
        this.filesMap.set(key, new Set());
      }
      
      this.filesMap.get(key)?.add(file);
    }
    
    // Log duplicates for debugging
    if (this.debug) {
      for (const [key, files] of this.filesMap.entries()) {
        if (files.size > 1) {
          this.log.info(`Found multiple versions of "${key}":`);
          files.forEach(file => this.log.detail(file));
        }
      }
    }
  }

  private collectFiles(directory: string, files: string[]): void {
    try {
      const dirFiles = fs.readdirSync(directory);
      
      for (const file of dirFiles) {
        const filePath = path.join(directory, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            this.collectFiles(filePath, files);
          } else {
            files.push(filePath);
          }
        } catch (error) {
          this.log.error(`Error reading file ${filePath}: ${error}`);
        }
      }
    } catch (error) {
      this.log.error(`Error reading directory ${directory}: ${error}`);
    }
  }

  private async convertToWebP(filePath: string): Promise<void> {
    this.currentImageIndex++;
    
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.inputDir, path.dirname(filePath));
    const outputDirPath = path.join(this.outputDir, relativePath);
    
    // Ensure output directory exists
    await this.ensureOutputDirectory(outputDirPath);
    
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const webpPath = path.join(outputDirPath, `${baseName}.webp`);
    
    // Check if there's already a WebP version in the input directory
    const baseNameKey = path.join(relativePath, baseName).toLowerCase();
    const files = this.filesMap.get(baseNameKey) || new Set();
    
    const existingWebp = Array.from(files).find(f => this.isWebP(f));
    
    if (existingWebp) {
      this.log.warning(`Found existing WebP version for ${filePath}`);
      this.log.detail(`Using existing WebP: ${existingWebp}`);
      
      // Skip the conversion and use the existing WebP file instead
      await this.copyWebP(existingWebp);
      this.existingWebpPreferred++;
      this.processedFiles.add(filePath);
      return;
    }
    
    if (this.debug) {
      this.log.info(`Processing image file: ${filePath}`);
      this.log.detail(`Output WebP path: ${webpPath}`);
    }
    
    try {
      this.processedFiles.add(filePath);
      const originalSize = fs.statSync(filePath).size;
      this.originalTotalSize += originalSize;
      
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize if width exceeds maxWidth
      if (metadata.width && metadata.width > this.maxWidth) {
        image.resize(this.maxWidth);
      }

      // Convert to WebP with specified quality
      await image.webp({ quality: this.quality }).toFile(webpPath);
      
      const newSize = fs.statSync(webpPath).size;
      this.finalTotalSize += newSize;
      const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(2);
      
      this.log.success(`Converted ${filePath} to WebP`);
      this.log.detail(`Output saved to: ${webpPath}`);
      this.log.detail(`Size reduction: ${reduction}% (${this.formatBytes(originalSize)} → ${this.formatBytes(newSize)})`);
      
      this.convertedImages++;
    } catch (error) {
      this.log.error(`Converting ${filePath}: ${error}`);
      this.errorFiles++;
      
      // If conversion fails, copy the original file
      await this.copyNonImageFile(filePath);
    }
  }

  private async copyWebP(filePath: string): Promise<void> {
    try {
      // Calculate the relative path and create the output path
      const relativePath = path.relative(this.inputDir, path.dirname(filePath));
      const outputDirPath = path.join(this.outputDir, relativePath);
      const fileName = path.basename(filePath);
      const outputFilePath = path.join(outputDirPath, fileName);
      
      if (this.debug) {
        this.log.info(`Processing WebP file: ${filePath}`);
        this.log.detail(`Output path: ${outputFilePath}`);
      }
      
      // Ensure output directory exists
      await this.ensureOutputDirectory(outputDirPath);
      
      // Skip if the file is in the output directory already
      if (fs.existsSync(outputFilePath)) {
        this.log.warning(`Skipping existing WebP file: ${fileName}`);
        this.skippedFiles++;
        this.processedFiles.add(filePath);
        return;
      }
      
      const originalSize = fs.statSync(filePath).size;
      this.originalTotalSize += originalSize;
      this.finalTotalSize += originalSize; // Same size as we're just copying
      
      // Copy the WebP file
      await copyFile(filePath, outputFilePath);
      this.log.success(`Copied WebP file: ${filePath} to ${outputFilePath}`);
      this.copiedFiles++;
      this.processedFiles.add(filePath);
    } catch (error) {
      this.log.error(`Copying WebP file ${filePath}: ${error}`);
      this.errorFiles++;
    }
  }

  private async copyNonImageFile(filePath: string): Promise<void> {
    try {
      // Calculate the relative path and create the output path
      const relativePath = path.relative(this.inputDir, path.dirname(filePath));
      const outputDirPath = path.join(this.outputDir, relativePath);
      const fileName = path.basename(filePath);
      const outputFilePath = path.join(outputDirPath, fileName);
      
      if (this.debug) {
        this.log.info(`Processing non-image file: ${filePath}`);
        this.log.detail(`Output path: ${outputFilePath}`);
      }
      
      // Ensure output directory exists
      await this.ensureOutputDirectory(outputDirPath);
      
      const originalSize = fs.statSync(filePath).size;
      this.originalTotalSize += originalSize;
      this.finalTotalSize += originalSize; // Same size as we're just copying
      
      // Copy the file
      await copyFile(filePath, outputFilePath);
      this.log.success(`Copied non-image file: ${filePath} to ${outputFilePath}`);
      this.copiedFiles++;
      this.processedFiles.add(filePath);
    } catch (error) {
      this.log.error(`Copying file ${filePath}: ${error}`);
      this.errorFiles++;
    }
  }

  private async processFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    
    if (this.isImage(fileName)) {
      await this.convertToWebP(filePath);
    } else if (this.isWebP(fileName)) {
      await this.copyWebP(filePath);
    } else {
      await this.copyNonImageFile(filePath);
    }
  }

  private async processDirectory(directory: string): Promise<void> {
    if (this.debug) {
      this.log.info(`Processing directory: ${directory}`);
    }
    
    let files;
    try {
      files = await readdir(directory);
    } catch (error) {
      this.log.error(`Reading directory ${directory}: ${error}`);
      return;
    }
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      let stats;
      
      try {
        stats = await stat(filePath);
      } catch (error) {
        this.log.error(`Getting stats for ${filePath}: ${error}`);
        continue;
      }
      
      if (stats.isDirectory()) {
        await this.processDirectory(filePath);
      } else {
        await this.processFile(filePath);
      }
    }
  }

  private getAllFilesFromDirectory(dirPath: string): string[] {
    const files: string[] = [];
    
    const getAllFilesRecursive = (currentPath: string) => {
      try {
        const dirFiles = fs.readdirSync(currentPath);
        
        for (const file of dirFiles) {
          const filePath = path.join(currentPath, file);
          try {
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
              getAllFilesRecursive(filePath);
            } else {
              files.push(filePath);
            }
          } catch (error) {
            this.log.error(`Error reading file ${filePath}: ${error}`);
          }
        }
      } catch (error) {
        this.log.error(`Error reading directory ${currentPath}: ${error}`);
      }
    };
    
    getAllFilesRecursive(dirPath);
    return files;
  }

  private checkMissingFiles(): void {
    const allInputFiles = this.getAllFilesFromDirectory(this.inputDir);
    const allOutputFiles = this.getAllFilesFromDirectory(this.outputDir);
    
    const missingFiles = allInputFiles.filter(file => !this.processedFiles.has(file));
    
    if (missingFiles.length > 0) {
      this.log.warning('\nSome files were not processed in the first pass. Processing them now:');
      missingFiles.forEach(file => {
        this.log.detail(`- ${file}`);
        
        // Try to process the file that was missed
        this.processFile(file).catch(error => {
          this.log.error(`Processing missed file ${file}: ${error}`);
        });
      });
    }
    
    const expectedOutputFiles = allInputFiles.length;
    const actualOutputFiles = allOutputFiles.length;
    
    this.log.info(`\nFiles in input directory: ${expectedOutputFiles}`);
    this.log.info(`Files in output directory: ${actualOutputFiles}`);
    
    if (expectedOutputFiles > actualOutputFiles) {
      this.log.warning(`${expectedOutputFiles - actualOutputFiles} files were not transferred to the output directory.`);
    }
  }

  private countImages(files: string[]): number {
    return files.filter(file => this.isImage(file)).length;
  }

  public async convert(): Promise<any> {
    this.log.header('Starting image conversion...');
    this.log.info(`Input directory: ${this.inputDir}`);
    this.log.info(`Output directory: ${this.outputDir}`);
    this.log.info(`Quality: ${this.quality}`);
    this.log.info(`Max width: ${this.maxWidth}`);
    
    try {
      // Reset counters
      this.processedFiles.clear();
      this.filesMap.clear();
      this.convertedImages = 0;
      this.copiedFiles = 0;
      this.skippedFiles = 0;
      this.errorFiles = 0;
      this.existingWebpPreferred = 0;
      this.originalTotalSize = 0;
      this.finalTotalSize = 0;
      
      // First, index all files to detect duplicate base names
      this.indexFiles(this.inputDir);
      
      // Count total images for progress tracking
      const allFiles = this.getAllFilesFromDirectory(this.inputDir);
      this.totalImages = this.countImages(allFiles);
      this.currentImageIndex = 0;
      
      this.log.info(`Found ${this.totalImages} image files to process`);
      this.progressCallback?.(0, `Found ${this.totalImages} image files to process`);
      
      const startTime = Date.now();
      
      // Ensure output directory exists
      await this.ensureOutputDirectory(this.outputDir);
      
      // Clear output directory if requested
      if (this.clearOutputDir) {
        await this.clearDirectory(this.outputDir);
      }
      
      await this.processDirectory(this.inputDir);
      
      // Check for any files that might have been missed
      this.checkMissingFiles();
      
      // Calculate space savings
      const savedBytes = this.originalTotalSize - this.finalTotalSize;
      const savingsPercentage = (savedBytes / this.originalTotalSize * 100).toFixed(2);
      
      const processingTime = Date.now() - startTime;
      
      this.log.header('Image conversion completed!');
      this.log.header('---------- Summary ----------');
      this.log.info(`Total files processed: ${this.processedFiles.size}`);
      this.log.success(`Images converted to WebP: ${this.convertedImages}`);
      this.log.success(`Files copied without conversion: ${this.copiedFiles}`);
      this.log.info(`Existing WebP files used instead of conversion: ${this.existingWebpPreferred}`);
      this.log.warning(`Files skipped: ${this.skippedFiles}`);
      
      if (this.errorFiles > 0) {
        this.log.error(`Errors encountered: ${this.errorFiles}`);
      } else {
        this.log.success('No errors encountered');
      }
      
      this.log.header('---------- Storage Summary ----------');
      this.log.info(`Original total size: ${this.formatBytes(this.originalTotalSize)}`);
      this.log.info(`Final total size: ${this.formatBytes(this.finalTotalSize)}`);
      this.log.success(`Space saved: ${this.formatBytes(savedBytes)} (${savingsPercentage}%)`);
      
      // Add progress callback before the end
      this.progressCallback?.(100, 'Conversion complete!');
      
      // Return result object
      return {
        convertedImages: this.convertedImages,
        copiedFiles: this.copiedFiles,
        skippedFiles: this.skippedFiles,
        errorFiles: this.errorFiles,
        existingWebpPreferred: this.existingWebpPreferred,
        originalTotalSize: this.originalTotalSize,
        finalTotalSize: this.finalTotalSize,
        processingTime
      };
    } catch (error) {
      this.log.error(`During conversion: ${error}`);
      return null;
    }
  }
} 