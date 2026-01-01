'use client';

import { useState } from 'react';

export default function Home() {
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('upload');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'loading' | 'error' | 'success'; message: string } | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'url' && !url) {
      setStatus({ type: 'error', message: 'Please enter a URL' });
      return;
    }

    if (inputMode === 'upload' && !file) {
      setStatus({ type: 'error', message: 'Please select a file' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'loading', message: 'Processing document...' });

    try {
      let response;
      let filename = 'document';

      if (inputMode === 'upload' && file) {
        filename = file.name.replace(/\.[^/.]+$/, '');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', filename);

        response = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Extract filename from URL
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const urlFilename = pathname.split('/').pop() || 'document';
          filename = urlFilename.replace(/\.[^/.]+$/, '') || 'document';
        } catch {
          filename = 'document';
        }

        response = await fetch('/api/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, title: filename }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert document');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${filename}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setShowSuccess(true);
      setUrl('');
      setFile(null);
      setFileKey(prev => prev + 1); // Reset file input
      setStatus(null);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertAnother = () => {
    setShowSuccess(false);
    setStatus(null);
  };

  if (showSuccess) {
    return (
      <div className="container">
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2>EPUB Downloaded Successfully!</h2>
          <div className="kindle-instructions">
            <h3>Get it to your Kindle:</h3>
            <p>
              <strong>Option 1: Email to Kindle</strong><br />
              Send an email with the EPUB file attached to your Kindle email address.
              Your Kindle has its own email, e.g. if your Amazon username is bob,
              then your Kindle email is something like <code>bob_432435@kindle.com</code>.
              You can find this email in your Kindle app settings.
            </p>
            <p>
              <strong>Option 2: Use Kindle App</strong><br />
              Open the Kindle app on your device and add the downloaded EPUB file directly.
            </p>
          </div>
          <button className="convert-another-btn" onClick={handleConvertAnother}>
            Convert Another Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Kindlify</h1>
      <p className="subtitle">Convert any document to EPUB ebook format (works for Kindle)</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Input Method</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-button ${inputMode === 'upload' ? 'active' : ''}`}
              onClick={() => setInputMode('upload')}
              disabled={loading}
            >
              Upload File
            </button>
            <button
              type="button"
              className={`toggle-button ${inputMode === 'url' ? 'active' : ''}`}
              onClick={() => setInputMode('url')}
              disabled={loading}
            >
              URL
            </button>
          </div>
        </div>

        {inputMode === 'upload' ? (
          <div className="form-group">
            <label htmlFor="file">Upload Document</label>
            <input
              key={fileKey}
              type="file"
              id="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.png,.jpg,.jpeg,.avif,.webp,.docx,.pptx"
              disabled={loading}
              required
            />
            {file && <p className="file-name">Selected: {file.name}</p>}
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="url">Document URL</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              disabled={loading}
              required
            />
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Converting...' : 'Convert to EPUB'}
        </button>
      </form>

      {status && (
        <div className={`status ${status.type}`}>
          {status.type === 'loading' && <span className="spinner" />}
          {status.message}
        </div>
      )}
    </div>
  );
}
