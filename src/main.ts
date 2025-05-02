import { ImageConverter } from './image-converter';
import readline from 'readline';

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

async function main() {
  console.log('Welcome to Aurora Image Converter!');
  console.log('This tool will convert your images to WebP format.');
  
  const inputDir = await prompt('Enter the input directory (default: ./public): ') || './public';
  const quality = parseInt(await prompt('Enter the quality (0-100, default: 80): ') || '80');
  const maxWidth = parseInt(await prompt('Enter the maximum width (default: 1920): ') || '1920');

  const converter = new ImageConverter({
    inputDir,
    quality,
    maxWidth
  });

  await converter.convert();
  rl.close();
}

main().catch(console.error); 