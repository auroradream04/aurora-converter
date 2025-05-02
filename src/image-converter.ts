import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface ConverterOptions {
  quality?: number;
  maxWidth?: number;
  inputDir?: string;
}

export class ImageConverter {
  private quality: number;
  private maxWidth: number;
  private inputDir: string;

  constructor(options: ConverterOptions = {}) {
    this.quality = options.quality ?? 80;
    this.maxWidth = options.maxWidth ?? 1920;
    this.inputDir = options.inputDir ?? path.join(process.cwd(), 'public');
  }

  private async isImage(file: string): Promise<boolean> {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  }

  private async convertToWebP(filePath: string): Promise<void> {
    const ext = path.extname(filePath);
    const webpPath = filePath.replace(ext, '.webp');
    
    // Skip if WebP version already exists
    if (fs.existsSync(webpPath)) {
      console.log(`Skipping ${filePath} - WebP version already exists`);
      return;
    }

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize if width exceeds maxWidth
      if (metadata.width && metadata.width > this.maxWidth) {
        image.resize(this.maxWidth);
      }

      // Convert to WebP with specified quality
      await image.webp({ quality: this.quality }).toFile(webpPath);
      
      const originalSize = fs.statSync(filePath).size;
      const newSize = fs.statSync(webpPath).size;
      const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(2);
      
      console.log(`Converted ${filePath} to WebP`);
      console.log(`Size reduction: ${reduction}% (${originalSize} bytes → ${newSize} bytes)`);
    } catch (error) {
      console.error(`Error converting ${filePath}:`, error);
    }
  }

  private async processDirectory(directory: string): Promise<void> {
    const files = await readdir(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        await this.processDirectory(filePath);
      } else if (await this.isImage(file)) {
        await this.convertToWebP(filePath);
      }
    }
  }

  public async convert(): Promise<void> {
    console.log('Starting image conversion...');
    console.log(`Input directory: ${this.inputDir}`);
    console.log(`Quality: ${this.quality}`);
    console.log(`Max width: ${this.maxWidth}`);
    
    try {
      await this.processDirectory(this.inputDir);
      console.log('Image conversion completed!');
    } catch (error) {
      console.error('Error during conversion:', error);
    }
  }
} 