import { HeadingLevel, Paragraph, TableOfContents } from 'docx';

export function makeTableOfContents(depth) {
  return [
    new Paragraph({ text: 'DAFTAR ISI', heading: HeadingLevel.HEADING_1, alignment: 'center', pageBreakBefore: true, spacing: { after: 360 }, run: { color: '000000' } }),
    new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-' + Math.max(1, Number(depth || 2)) })
  ];
}
