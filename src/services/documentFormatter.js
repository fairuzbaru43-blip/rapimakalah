import { findFirstChapterIndex, parseDocument, insertGeneratedCover } from './documentParser.js';

export const defaultSettings = {
  template: 'college',
  rules: { margins: true, font: true, fontSize: true, lineSpacing: true, indentation: true, alignment: true, headings: true, paragraphSpacing: true, pageNumbers: true, toc: false, cover: false, preface: false },
  typography: { font: 'Times New Roman', size: 12, lineSpacing: 1.5, indent: 1.25, alignment: 'justify', before: 0, after: 8 },
  paper: { size: 'A4', orientation: 'portrait', top: 3, bottom: 3, left: 4, right: 3 },
  headings: { chapterSize: 14, subheadingSize: 12, chapterAlignment: 'center', boldChapter: true, uppercaseChapter: true, boldSubheading: true },
  numbering: { enabled: true, frontRoman: true, bodyArabic: true, position: 'center', coverWithoutNumber: true },
  tocDepth: 2
};

export const defaultMetadata = {
  title: '', course: '', teacher: '', author: '', className: '', program: '', department: '', faculty: '',
  institution: '', city: '', year: String(new Date().getFullYear()), members: []
};

export function formatDocument(source, settings, metadata) {
  const parsed = parseDocument(source);
  let html = parsed.html;
  const coverAdded = Boolean(settings.rules.cover && !parsed.analysis.hasCover);
  if (coverAdded) html = insertGeneratedCover(metadata) + html;
  const tocAdded = Boolean(settings.rules.toc);
  if (tocAdded) {
    const tocHeadingIndex = parsed.blocks.findIndex((block) => block.type === 'heading1' && /^DAFTAR ISI\b/i.test(block.text || ''));
    const chapterIndex = findFirstChapterIndex(parsed.blocks);
    const headings = parsed.blocks.filter((block, index) =>
      (block.type === 'heading1' || block.type === 'heading2') &&
      !(tocHeadingIndex >= 0 && index >= tocHeadingIndex && (chapterIndex < 0 || index < chapterIndex))
    );
    const rows = headings.map((block) => '<p class="toc-row ' + block.type + '">' + block.text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]) + '</p>').join('');
    const toc = '<section class="generated-toc"><h1>DAFTAR ISI</h1>' + rows + '</section>';
    if (tocHeadingIndex >= 0) {
      const start = html.indexOf(parsed.blocks[tocHeadingIndex].html);
      const nextContent = chapterIndex >= 0 ? html.indexOf(parsed.blocks[chapterIndex].html) : -1;
      if (start >= 0) {
        const end = nextContent > start ? nextContent : html.length;
        html = html.slice(0, start) + toc + html.slice(end);
      }
    } else {
      const chapter = chapterIndex >= 0 ? parsed.blocks[chapterIndex] : null;
      const insertion = chapter ? html.indexOf(chapter.html) : -1;
      html = insertion >= 0 ? html.slice(0, insertion) + toc + html.slice(insertion) : html + toc;
    }
  }
  const formatted = parseDocument(html);
  const warnings = [];
  if (!formatted.analysis.chapterCount) warnings.push('Belum ada judul BAB yang dikenali.');
  if (!formatted.analysis.hasReferences) warnings.push('Daftar pustaka belum terdeteksi.');
  if (!formatted.analysis.headingCount) warnings.push('Heading belum terdeteksi; tandai judul bagian di editor untuk navigasi struktur.');
  if (formatted.analysis.paragraphCount === 0) warnings.push('Dokumen belum berisi paragraf.');
  return { html, blocks: formatted.blocks, analysis: formatted.analysis, warnings, coverAdded, tocAdded };
}

export function estimatePageCount(blocks, settings) {
  const paperSizes = { A4: [1123, 794], A5: [794, 559], Letter: [1056, 816], Legal: [1344, 816], F4: [1247, 812] };
  const paperHeight = paperSizes[settings.paper.size] || paperSizes.A4;
  const pageHeight = settings.paper.orientation === 'landscape' ? paperHeight[1] : paperHeight[0];
  const top = settings.rules.margins ? settings.paper.top : 2.54;
  const bottom = settings.rules.margins ? settings.paper.bottom : 2.54;
  const usable = pageHeight - ((top + bottom) * 37.8);
  const size = settings.rules.fontSize ? Number(settings.typography.size || 12) : 12;
  const spacing = settings.rules.lineSpacing ? Number(settings.typography.lineSpacing || 1.5) : 1.15;
  const lineHeight = size * 1.6 * spacing;
  const capacity = Math.max(18, usable / Math.max(lineHeight, 16));
  let lines = 0;
  let pages = 1;
  blocks.forEach((block) => {
    const pageBreak = block.type === 'heading1' && /^(BAB\s|KATA PENGANTAR|DAFTAR ISI|DAFTAR PUSTAKA)/i.test(block.text || '');
    if (pageBreak && lines > 0) { pages += 1; lines = 0; }
    let blockLines = 1;
    if (block.type === 'heading1') blockLines = 3;
    else if (block.type === 'heading2') blockLines = 2;
    else if (block.type === 'table') blockLines = Math.max(3, (block.rows || []).length * 2);
    else if (block.type === 'image') blockLines = 9;
    else {
      const length = (block.text || (block.items || []).map((item) => item.text).join(' ') || '').length;
      blockLines = Math.max(1, Math.ceil(length / 88)) + 0.7;
    }
    if (lines > 0 && lines + blockLines > capacity) { pages += 1; lines = 0; }
    lines += blockLines;
  });
  return pages;
}
