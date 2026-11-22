import {
  AlignmentType, Document, ImageRun, NumberFormat, Paragraph,
  Packer, Table, TableCell, TableRow, TextRun, WidthType
} from 'docx';
import { createPageFooter, createPageSettings } from './pageNumbering.js';
import { makeTableOfContents } from './tableOfContents.js';
import { imageBytes, paragraphsForBlock } from './docxProcessor.js';
import { findFirstChapterIndex } from './documentParser.js';

function coverParagraphs(metadata, settings) {
  const center = AlignmentType.CENTER;
  const font = settings.typography.font;
  const authors = (metadata.members || []).map((item) => item.name).filter(Boolean);
  if (!authors.length && metadata.author) authors.push(metadata.author);
  const paragraphs = [
    new Paragraph({ text: 'MAKALAH', alignment: center, spacing: { before: 900, after: 360 }, run: { bold: true, size: 28, font, color: '000000' } }),
    new Paragraph({ text: metadata.title || 'Judul Makalah', alignment: center, spacing: { before: 700, after: 3600 }, run: { bold: true, size: 32, font, color: '000000' } }),
    new Paragraph({ text: 'Disusun untuk memenuhi tugas' + (metadata.course ? ' ' + metadata.course : ''), alignment: center, spacing: { after: 300 }, run: { size: 24, font, color: '000000' } }),
    ...(metadata.teacher ? [new Paragraph({ text: 'Dibimbing oleh ' + metadata.teacher, alignment: center, spacing: { after: 250 }, run: { size: 22, font, color: '000000' } })] : []),
    new Paragraph({ text: 'Disusun oleh', alignment: center, spacing: { before: 900, after: 200 }, run: { bold: true, size: 24, font, color: '000000' } })
  ];
  const logo = imageBytes(metadata.coverImage);
  if (logo) paragraphs.unshift(new Paragraph({
    alignment: center,
    children: [new ImageRun({ data: logo, transformation: { width: 125, height: 95 } })],
    spacing: { after: 240 }
  }));
  (metadata.members || []).filter((item) => item.name).forEach((item) => paragraphs.push(new Paragraph({
    text: [item.name, item.idNumber ? 'NIM ' + item.idNumber : ''].filter(Boolean).join(' — '),
    alignment: center, spacing: { after: 100 }, run: { size: 24, font, color: '000000' }
  })));
  if (!(metadata.members || []).some((item) => item.name) && authors.length) paragraphs.push(new Paragraph({ text: authors[0], alignment: center, spacing: { after: 100 }, run: { size: 24, font, color: '000000' } }));
  [metadata.className, metadata.program, metadata.department, metadata.faculty].filter(Boolean)
    .forEach((line) => paragraphs.push(new Paragraph({ text: line, alignment: center, spacing: { after: 100 }, run: { size: 24, font, color: '000000' } })));
  if (metadata.institution) paragraphs.push(new Paragraph({ text: metadata.institution, alignment: center, spacing: { before: 1400, after: 200 }, run: { bold: true, size: 24, font, color: '000000' } }));
  paragraphs.push(new Paragraph({ text: [metadata.city, metadata.year].filter(Boolean).join(', '), alignment: center, spacing: { before: 150, after: 200 }, run: { size: 24, font, color: '000000' } }));
  return paragraphs;
}

function blockChildren(block, settings) {
  if (block.type === 'image') {
    const data = imageBytes(block.src);
    if (data) return [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new ImageRun({ data, transformation: { width: 420, height: 300 } })
    ] })];
    return block.alt ? [new Paragraph({ text: '[Gambar: ' + block.alt + ']' })] : [];
  }
  if (block.type === 'table') {
    const rows = (block.rows || []).map((row) => new TableRow({
      children: row.map((cell) => new TableCell({
        children: [new Paragraph({ children: [
          new TextRun({
            text: cell.text || '',
            font: settings.rules.font ? settings.typography.font : undefined,
            size: settings.rules.fontSize ? Number(settings.typography.size || 12) * 2 : undefined,
            color: '000000'
          })
        ] })],
        margins: { top: 100, bottom: 100, left: 120, right: 120 }
      }))
    }));
    return rows.length ? [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })] : [];
  }
  return paragraphsForBlock(block, settings);
}

function splitSections(blocks, settings, metadata, addGeneratedCover) {
  const chapter = findFirstChapterIndex(blocks);
  let front = chapter >= 0 ? blocks.slice(0, chapter) : [];
  let body = chapter >= 0 ? blocks.slice(chapter) : blocks;
  if (chapter < 0 && blocks.some((block) => block.cover)) {
    front = blocks.filter((block) => block.cover);
    body = blocks.filter((block) => !block.cover);
  }
  const pageFormat = settings.numbering.frontRoman ? NumberFormat.LOWER_ROMAN : NumberFormat.DECIMAL;
  const sourceCoverBlocks = front.filter((block) => block.cover);
  const coverChildren = addGeneratedCover
    ? coverParagraphs(metadata, settings)
    : sourceCoverBlocks.flatMap((block) => blockChildren(block, settings));
  const frontBlocks = front.filter((block) => !block.cover);
  const frontChildren = [];
  const sourceTocIndex = frontBlocks.findIndex((block) => block.type === 'heading1' && /^DAFTAR ISI\b/i.test(block.text || ''));
  const printableFront = settings.rules.toc && sourceTocIndex >= 0 ? frontBlocks.slice(0, sourceTocIndex) : frontBlocks;
  const prefaceStart = printableFront.findIndex((block) => /^KATA PENGANTAR\b/i.test(block.text || ''));
  const prefaceEnd = prefaceStart < 0 ? -1 : printableFront.findIndex((block, index) => index > prefaceStart && block.type === 'heading1');
  const signatureStart = prefaceEnd >= 0 ? prefaceEnd : printableFront.length;
  const signatureIndexes = new Set();
  const addToc = settings.rules.toc;
  const tocPosition = prefaceStart >= 0
    ? (prefaceEnd >= 0 ? prefaceEnd : printableFront.length)
    : 0;
  if (settings.rules.preface && prefaceStart >= 0) {
    const candidates = printableFront.slice(prefaceStart + 1, signatureStart)
      .map((block, index) => ({ block, index: prefaceStart + 1 + index }))
      .filter(({ block }) => block.type === 'paragraph' && block.text);
    candidates.slice(-2).forEach(({ index }) => signatureIndexes.add(index));
  }
  if (addToc && tocPosition === 0) frontChildren.push(...makeTableOfContents(settings.tocDepth));
  printableFront.forEach((block, index) => {
    frontChildren.push(...blockChildren(
    signatureIndexes.has(index) ? { ...block, signature: true } : block, settings
    ));
    if (addToc && index + 1 === tocPosition) frontChildren.push(...makeTableOfContents(settings.tocDepth));
  });
  const bodyChildren = [];
  body.forEach((block) => bodyChildren.push(...blockChildren(block, settings)));
  const sections = [];
  const numberPosition = settings.numbering.position === 'right' ? 'right' : 'center';
  const pageNumbering = settings.rules.pageNumbers && settings.numbering.enabled;
  const coverHasNumber = pageNumbering && !settings.numbering.coverWithoutNumber;
  if (coverChildren.length) sections.push({
    properties: { page: createPageSettings(settings, coverHasNumber ? pageFormat : undefined, 1) },
    footers: coverHasNumber ? { default: createPageFooter(numberPosition) } : undefined,
    children: coverChildren
  });
  if (frontChildren.length) sections.push({
    properties: { page: createPageSettings(settings, pageNumbering ? pageFormat : undefined, coverChildren.length && coverHasNumber ? 2 : 1) },
    footers: pageNumbering ? { default: createPageFooter(numberPosition) } : undefined,
    children: frontChildren
  });
  if (bodyChildren.length) sections.push({
    properties: { page: createPageSettings(settings, pageNumbering ? NumberFormat.DECIMAL : undefined, 1) },
    footers: pageNumbering ? { default: createPageFooter(numberPosition) } : undefined,
    children: bodyChildren
  });
  if (!sections.length) sections.push({ properties: { page: createPageSettings(settings) }, children: [new Paragraph('Dokumen belum memiliki isi.')] });
  return sections;
}

export async function createDocxBlob({ blocks, settings, metadata, addGeneratedCover }) {
  const document = new Document({
    creator: metadata.author || 'RapiMakalah Pro',
    title: metadata.title || 'Makalah',
    description: 'Diformat dengan RapiMakalah Pro',
    features: { updateFields: true },
    styles: {
      default: {
        document: { run: { font: settings.typography.font, size: Number(settings.typography.size || 12) * 2, color: '000000' } },
        paragraph: { spacing: { line: Math.round(240 * Number(settings.typography.lineSpacing || 1.5)) } }
      }
    },
    sections: splitSections(blocks, settings, metadata, addGeneratedCover)
  });
  return Packer.toBlob(document);
}
