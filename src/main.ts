import { ImageConverter } from './image-converter';
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
  console.log('Welcome to Aurora Image Converter!');
  console.log('This tool will convert your images to WebP format.');
  
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
    console.log(`Please add your images to ${path.resolve(inputDir)} and run the program again.`);
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
    clearOutputDir = await promptYesNo('Output directory is not empty. Do you want to clear it before conversion?');
  }
  
  // Prompt for other parameters
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
  rl.close();
}

main().catch(console.error); 