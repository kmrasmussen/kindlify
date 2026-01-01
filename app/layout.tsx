import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindlify - Convert Documents to EPUB",
  description: "Convert documents to EPUB using Mistral OCR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
