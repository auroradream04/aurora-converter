# Aurora Converter

A terminal-based utility that converts images to WebP format and compresses video files while preserving their format.

## Features

- Convert images to WebP format
- Compress video files (MP4, AVI, MOV, etc.)
- Configurable quality settings for both images and videos
- Automatic image resizing
- Recursive directory processing
- Terminal-based interface
- Input and output directory management
- Copy non-image files to preserve full directory content

## Installation

```bash
# Clone the repository
git clone https://github.com/auroradream04/aurora-converter.git
cd aurora-converter

# Install dependencies
npm install
```

## Usage

```bash
# Development mode
npm run dev

# Build and run
npm run build
npm start
```

When you run the converter, you'll have two options:

### 1. Image Conversion

The image converter will:

1. Ask for input directory path (default: `./input`)
2. Ask for output directory path (default: `./output`)
3. Prompt to clear the output directory if it's not empty
4. Ask for quality settings (0-100, default: 80)
5. Ask for maximum width (default: 1920px)

All images in the input directory will be converted to WebP format and saved to the output directory, preserving the original directory structure. 

### 2. Video Compression

The video compressor will:

1. Ask for input directory path (default: `./input`)
2. Ask for output directory path (default: `./output`)
3. Prompt to clear the output directory if it's not empty
4. Ask for CRF (Constant Rate Factor) value (0-51, default: 23, lower = better quality)
5. Ask for preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)

All video files in the input directory will be compressed while maintaining their original format and saved to the output directory, preserving the original directory structure.

## Directory Structure

The project comes with two default directories:

- `input/`: Place your images or videos here to be processed
- `output/`: Converted/compressed files will be saved here

## Configuration

The program will prompt for these settings when run.

For images:
- WebP quality (0-100)
- Maximum width for images

For videos:
- CRF value (0-51, lower is better quality but larger file size)
- Encoding preset (affects compression speed and efficiency)

## Requirements

The video compression feature requires FFmpeg, which is automatically installed via the ffmpeg-static npm package.

## License

MIT 