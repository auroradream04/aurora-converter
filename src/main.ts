import { ImageConverter } from './image-converter';
import { VideoCompressor } from './video-compressor';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function promptYesNo(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (y/n): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function main() {
  console.log('Welcome to Aurora Converter!');
  
  // Ask the user what they want to do
  console.log('What would you like to do?');
  console.log('1. Convert images to WebP');
  console.log('2. Compress videos');
  
  const choice = await prompt('Enter your choice (1-2): ');
  
  // Default directories
  const defaultInputDir = './input';
  const defaultOutputDir = './output';
  
  // Prompt for input directory
  const inputDirPrompt = await prompt(`Enter the input directory (default: ${defaultInputDir}): `);
  const inputDir = inputDirPrompt || defaultInputDir;
  
  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.log(`Input directory ${inputDir} does not exist. Creating it...`);
    fs.mkdirSync(inputDir, { recursive: true });
    console.log(`Please add your files to ${path.resolve(inputDir)} and run the program again.`);
    rl.close();
    return;
  }
  
  // Prompt for output directory
  const outputDirPrompt = await prompt(`Enter the output directory (default: ${defaultOutputDir}): `);
  const outputDir = outputDirPrompt || defaultOutputDir;
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if output directory has content and prompt for clearing
  let clearOutputDir = false;
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
    clearOutputDir = await promptYesNo('Output directory is not empty. Do you want to clear it before processing?');
  }

  if (choice === '1') {
    // Image conversion
    const quality = parseInt(await prompt('Enter the quality (0-100, default: 80): ') || '80');
    const maxWidth = parseInt(await prompt('Enter the maximum width (default: 1920): ') || '1920');

    const converter = new ImageConverter({
      inputDir,
      outputDir,
      clearOutputDir,
      quality,
      maxWidth
    });

    await converter.convert();
  } else if (choice === '2') {
    // Video compression
    console.log('Video Compression Settings:');
    console.log('CRF (Constant Rate Factor): 0-51, lower value = better quality, larger file size');
    console.log('Recommended values: 18 (high quality), 23 (default), 28 (lower quality)');
    const crf = parseInt(await prompt('Enter the CRF value (default: 23): ') || '23');
    
    console.log('Preset: Controls compression efficiency vs. encoding speed');
    console.log('Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow');
    console.log('Slower presets = smaller file size but longer encoding time');
    const preset = await prompt('Enter the preset (default: medium): ') || 'medium';
    
    const compressor = new VideoCompressor({
      inputDir,
      outputDir,
      clearOutputDir,
      crf,
      preset
    });
    
    await compressor.compress();
  } else {
    console.log('Invalid choice. Please run the program again and select a valid option.');
  }
  
  rl.close();
}

main().catch(console.error); 