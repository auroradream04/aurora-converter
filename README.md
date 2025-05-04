# Aurora Converter

A cross-platform desktop utility with a modern dark-themed GUI for image conversion and video compression.

## Features

- Convert images to WebP format
- Compress video files (MP4, AVI, MOV, etc.)
- Dark-themed GUI interface
- Configurable quality settings for both images and videos
- Automatic image resizing
- Recursive directory processing
- Progress tracking
- Available for macOS and Windows

## Usage

Aurora Converter provides two main functions:

### 1. Image Conversion

- Convert images to WebP format
- Configurable quality settings (0-100)
- Maximum width control
- Preserves original directory structure

### 2. Video Compression

- Compress video files while maintaining the original format
- Configurable compression quality via CRF (Constant Rate Factor)
- Multiple compression presets (ultrafast to veryslow)
- No conversion between formats - same format in, just smaller

## Installation

### macOS and Windows

1. Download the installer for your operating system from the Releases page
2. Run the installer and follow the instructions
3. Launch the application from your applications folder or start menu

### Building from Source

```bash
# Clone the repository
git clone https://github.com/auroradream04/aurora-converter.git
cd aurora-converter

# Install dependencies
npm install

# Start the application in development mode
npm start

# Package the application for your platform
npm run package-mac  # For macOS
npm run package-win  # For Windows
npm run package      # For both platforms
```

## Development

The application is built with:

- Electron for cross-platform desktop capabilities
- TypeScript for type-safe JavaScript
- Sharp for image processing
- FFmpeg for video compression

## Requirements

The application is self-contained and includes all necessary dependencies:

- Sharp for image processing
- FFmpeg for video compression

## License

MIT 