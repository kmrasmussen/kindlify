import fs from 'fs';
import { Mistral } from '@mistralai/mistralai';
import nodepub from 'nodepub';

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  console.error('❌ MISTRAL_API_KEY not set');
  process.exit(1);
}

const client = new Mistral({ apiKey });

async function testBackend() {
  try {
    console.log('📄 Reading PDF file...');
    const pdfPath = '/home/kasper/Downloads/Hofstadter_2001_-_Analogy_as_the_Core_of_Cognition.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log('📤 Uploading to Mistral...');
    const uploadedFile = await client.files.upload({
      file: {
        fileName: 'hofstadter.pdf',
        content: pdfBuffer,
      },
      purpose: 'ocr',
    });

    console.log('✓ File uploaded:', uploadedFile.id);

    console.log('🔗 Getting signed URL...');
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    console.log('✓ Got signed URL');

    console.log('🔍 Processing with Mistral OCR...');
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: signedUrl.url,
      },
      tableFormat: 'markdown',
      includeImageBase64: false,
    });

    console.log('✓ OCR completed. Pages:', ocrResponse.pages.length);

    console.log('🗑️  Deleting uploaded file...');
    await client.files.delete({ fileId: uploadedFile.id });
    console.log('✓ File deleted');

    // Combine markdown
    const markdownContent = ocrResponse.pages
      .map(page => page.markdown)
      .join('\n\n---\n\n');

    console.log('📝 Total markdown length:', markdownContent.length, 'characters');
    console.log('📝 First 200 chars:', markdownContent.substring(0, 200));

    // Convert to HTML
    const htmlContent = markdownToHtml(markdownContent);
    console.log('✓ Converted to HTML');

    console.log('📚 Generating EPUB...');

    // Create a minimal 1x1 transparent PNG for cover
    const minimalCover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const coverPath = '/tmp/cover.png';
    fs.writeFileSync(coverPath, minimalCover);

    const epub = nodepub.document({
      id: Date.now().toString(),
      title: 'Hofstadter Test',
      author: 'Kindlify',
      language: 'en',
      cover: coverPath,
    });

    epub.addSection('Hofstadter Test', htmlContent);

    // Generate the EPUB file
    await epub.writeEPUB('/tmp', 'test-output');
    console.log('✓ EPUB generated and saved to /tmp/test-output.epub');

    // Check file size
    const stats = fs.statSync('/tmp/test-output.epub');
    console.log('✓ File size:', stats.size, 'bytes');

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

function markdownToHtml(markdown) {
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

testBackend();
