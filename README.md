# Aurora Converter

A terminal-based image converter that converts images to WebP format with configurable quality and size settings.

## Features

- Convert images to WebP format
- Configurable quality settings
- Automatic image resizing
- Recursive directory processing
- Terminal-based interface

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

## Configuration

You can modify the following constants in `src/image-converter.ts`:
- `QUALITY`: WebP quality (0-100)
- `MAX_WIDTH`: Maximum width for images

## License

MIT 