# Kindlify

Convert any document or image to EPUB using Mistral OCR.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your Mistral API key in `.env.local`:
```
MISTRAL_API_KEY=your_actual_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a URL to a document (PDF, DOCX, PPTX) or image (PNG, JPG, etc.)
2. Optionally add a title for your EPUB
3. Click "Convert to EPUB"
4. Download the generated EPUB file

## Supported Formats

- **Documents**: PDF, DOCX, PPTX
- **Images**: PNG, JPEG, JPG, AVIF, WebP

## How it Works

1. User provides a URL to a document or image
2. The app sends the URL to Mistral OCR API for processing
3. Mistral OCR extracts text and maintains document structure
4. The markdown output is converted to HTML
5. An EPUB file is generated and downloaded

## Environment Variables

- `MISTRAL_API_KEY` - Your Mistral AI API key (required)
