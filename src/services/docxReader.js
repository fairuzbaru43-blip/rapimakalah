import mammoth from 'mammoth/mammoth.browser.js';
import JSZip from 'jszip';

export async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const archive = await JSZip.loadAsync(arrayBuffer);
  if (!archive.file('word/document.xml')) throw new Error('File DOCX tidak berisi dokumen Word yang valid.');
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  const expandedBytes = entries.reduce((total, entry) => total + (entry._data && entry._data.uncompressedSize || 0), 0);
  if (entries.length > 2000 || expandedBytes > 100 * 1024 * 1024) {
    throw new Error('Isi DOCX terlalu besar atau strukturnya tidak wajar.');
  }
  const mediaCount = entries.filter((entry) => entry.name.startsWith('word/media/')).length;
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: [
      "p[style-name='Title'] => h1.title:fresh",
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='heading 1'] => h1:fresh",
      "p[style-name='heading 2'] => h2:fresh"
    ],
    convertImage: mammoth.images.inline(async (image) => ({
      src: 'data:' + image.contentType + ';base64,' + await image.read('base64')
    }))
  });
  return { html: result.value, messages: result.messages || [], mediaCount };
}
