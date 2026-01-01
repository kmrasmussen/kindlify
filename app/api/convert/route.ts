import { Mistral } from '@mistralai/mistralai';
import { NextRequest, NextResponse } from 'next/server';
import nodepub from 'nodepub';

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  throw new Error('MISTRAL_API_KEY is not set in environment variables');
}

const client = new Mistral({ apiKey });

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let url: string | undefined;
    let title: string;
    let uploadedFileId: string | undefined;

    // Check if this is a file upload or URL request
    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      title = (formData.get('title') as string) || 'Document';

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload file to Mistral
      const uploadedFile = await client.files.upload({
        file: {
          fileName: file.name,
          content: buffer,
        },
        purpose: 'ocr',
      });

      uploadedFileId = uploadedFile.id;

      // Get signed URL
      const signedUrlResponse = await client.files.getSignedUrl({
        fileId: uploadedFile.id,
      });

      url = signedUrlResponse.url;
    } else {
      // Handle URL request
      const body = await request.json();
      url = body.url;
      title = body.title || 'Document';

      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        );
      }
    }

    // Determine document type based on URL extension
    const urlLower = url.toLowerCase();
    const isImage = /\.(png|jpg|jpeg|avif|webp)$/i.test(urlLower);

    let documentType: 'document_url' | 'image_url';

    if (isImage) {
      documentType = 'image_url';
    } else {
      // Default to document_url for PDFs and other formats
      documentType = 'document_url';
    }

    // Process document with Mistral OCR
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: documentType === 'image_url'
        ? { type: 'image_url', imageUrl: url }
        : { type: 'document_url', documentUrl: url },
      tableFormat: 'markdown',
      includeImageBase64: false,
    });

    // Delete uploaded file if it exists
    if (uploadedFileId) {
      try {
        await client.files.delete({ fileId: uploadedFileId });
      } catch (error) {
        console.error('Error deleting uploaded file:', error);
      }
    }

    // Combine all pages markdown content
    const markdownContent = ocrResponse.pages
      .map(page => page.markdown)
      .join('\n\n---\n\n');

    // Convert markdown to HTML for EPUB
    const htmlContent = markdownToHtml(markdownContent);

    // Create a minimal 1x1 transparent PNG for cover
    const fs = await import('fs');
    const minimalCover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const coverPath = '/tmp/cover-' + Date.now() + '.png';
    const epubFilename = 'epub-' + Date.now();
    const epubPath = '/tmp/' + epubFilename + '.epub';

    fs.writeFileSync(coverPath, minimalCover);

    // Generate EPUB using nodepub
    const epub = nodepub.document({
      id: Date.now().toString(),
      title: title || 'Document',
      author: 'Kindlify',
      language: 'en',
      cover: coverPath,
    });

    // Add content as a section
    epub.addSection(title || 'Document', htmlContent);

    // Write EPUB to temp file
    await epub.writeEPUB('/tmp', epubFilename);

    // Read EPUB as buffer
    const epubBuffer = fs.readFileSync(epubPath);

    // Cleanup temporary files
    fs.unlinkSync(coverPath);
    fs.unlinkSync(epubPath);

    // Return EPUB file
    return new NextResponse(epubBuffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${title || 'document'}.epub"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs
  html = '<p>' + html + '</p>';

  // Lists
  html = html.replace(/<p>- (.*?)<\/p>/g, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul><br><ul>/g, '');
  html = html.replace(/<p>\d+\. (.*?)<\/p>/g, '<ol><li>$1</li></ol>');
  html = html.replace(/<\/ol><br><ol>/g, '');

  // Horizontal rules
  html = html.replace(/<p>---<\/p>/g, '<hr>');

  return html;
}
