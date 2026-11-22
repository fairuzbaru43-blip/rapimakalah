import { HeadingLevel, Paragraph, TextRun } from 'docx';

export function inlineRuns(html, textFallback) {
  const parsed = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
  const root = parsed.body.firstElementChild;
  const runs = [];
  function visit(node, style) {
    if (node.nodeType === 3) {
      if (node.nodeValue) runs.push(new TextRun({
        text: node.nodeValue,
        color: '000000',
        bold: style.bold || undefined,
        italics: style.italics || undefined,
        underline: style.underline ? {} : undefined,
        strike: style.strike || undefined
      }));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { runs.push(new TextRun({ break: 1 })); return; }
    const next = {
      bold: style.bold || ['b', 'strong'].includes(tag),
      italics: style.italics || ['i', 'em'].includes(tag),
      underline: style.underline || tag === 'u',
      strike: style.strike || tag === 's' || tag === 'del'
    };
    Array.from(node.childNodes).forEach((child) => visit(child, next));
  }
  if (root) Array.from(root.childNodes).forEach((node) => visit(node, {}));
  return runs.length ? runs : [new TextRun({ text: textFallback || '', color: '000000' })];
}

export function paragraphsForBlock(block, settings) {
  const font = settings.rules.font ? settings.typography.font : undefined;
  const size = settings.rules.fontSize ? Math.round(Number(settings.typography.size || 12) * 2) : undefined;
  const indent = Math.round(Number(settings.typography.indent || 0) * 567);
  const spacing = {};
  if (settings.rules.paragraphSpacing) {
    spacing.before = Math.round(Number(settings.typography.before || 0) * 20);
    spacing.after = Math.round(Number(settings.typography.after || 0) * 20);
  }
  if (settings.rules.lineSpacing) spacing.line = Math.round(240 * Number(settings.typography.lineSpacing || 1.5));
  const common = { run: { font, size, color: '000000' }, spacing };
  if (block.cover) {
    const coverTitle = String(block.html || '').includes('cover-title');
    return [new Paragraph({
      alignment: 'center',
      indent: { firstLine: 0 },
      children: coverTitle
        ? [new TextRun({ text: block.text || '', font, size: 32, bold: true, color: '000000' })]
        : inlineRuns(block.html, block.text),
      spacing: { before: coverTitle ? 1200 : 200, after: coverTitle ? 700 : 200 },
      ...common
    })];
  }
  if (settings.rules.headings && (block.type === 'heading1' || block.type === 'heading2')) {
    const chapter = block.type === 'heading1';
    const value = chapter && settings.headings.uppercaseChapter ? block.text.toLocaleUpperCase('id-ID') : block.text;
    const headingSize = Math.round(Number(chapter ? settings.headings.chapterSize : settings.headings.subheadingSize) * 2);
    const alignment = chapter ? settings.headings.chapterAlignment : 'left';
    return [new Paragraph({
      children: [new TextRun({ text: value, font, size: headingSize, bold: chapter ? settings.headings.boldChapter : settings.headings.boldSubheading, color: '000000' })],
      heading: chapter ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      alignment: settings.rules.alignment ? (alignment === 'center' ? 'center' : 'left') : undefined,
      pageBreakBefore: chapter && /^(BAB\s|DAFTAR ISI\b|DAFTAR PUSTAKA\b)/i.test(value),
      spacing: { before: chapter ? 240 : 140, after: 180, line: 240 }
    })];
  }
  if (block.type === 'list') {
    return (block.items || []).map((item, index) => {
      const runs = inlineRuns(item.html, item.text);
      return new Paragraph({
        children: block.ordered ? [new TextRun({ text: String(index + 1) + '. ', color: '000000' }), ...runs] : runs,
        bullet: block.ordered ? undefined : { level: 0 },
        indent: block.ordered ? { left: 720, hanging: 360 } : undefined,
        ...common
      });
    });
  }
  return [new Paragraph({
    children: inlineRuns(block.html, block.text),
    alignment: block.signature ? 'right' : settings.rules.alignment
      ? (settings.typography.alignment === 'justify' ? 'both' : settings.typography.alignment) : undefined,
    indent: !block.signature && settings.rules.indentation ? { firstLine: indent } : undefined,
    ...common
  })];
}

export function imageBytes(source) {
  if (!source || !source.startsWith('data:')) return null;
  const encoded = source.split(',')[1] || '';
  const binary = atob(encoded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
