# Aurora Converter

A terminal-based image converter that converts images to WebP format with configurable quality and size settings.

## Features

- Convert images to WebP format
- Configurable quality settings
- Automatic image resizing
- Recursive directory processing
- Terminal-based interface
- Input and output directory management
- Copy non-image files to preserve full directory content

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aurora-converter.git
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

The converter will:

1. Ask for input directory path (default: `./input`)
2. Ask for output directory path (default: `./output`)
3. Prompt to clear the output directory if it's not empty
4. Ask for quality settings (0-100, default: 80)
5. Ask for maximum width (default: 1920px)

All images in the input directory will be converted to WebP format and saved to the output directory, preserving the original directory structure. Non-image files will also be copied to the output directory without any conversion, ensuring all content is preserved.

## Directory Structure

The project comes with two default directories:

- `input/`: Place your images here to be converted
- `output/`: Converted WebP images will be saved here

## Configuration

The program will prompt for these settings when run:
- Input directory
- Output directory
- Whether to clear the output directory
- WebP quality (0-100)
- Maximum width for images

## License

MIT 