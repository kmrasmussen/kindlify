declare module 'nodepub' {
  interface Metadata {
    id: string;
    title: string;
    author: string;
    language: string;
    cover: string;
    showContents?: boolean;
  }

  interface Section {
    title: string;
    content: string;
  }

  interface Document {
    addSection(title: string, content: string): void;
    writeEPUB(folder: string, filename: string): Promise<void>;
    getFilesForEPUB(): Promise<Record<string, string | Buffer>>;
  }

  function document(metadata: Metadata, generateContentsCallback?: Function): Document;

  export { document };
  export default { document };
}
