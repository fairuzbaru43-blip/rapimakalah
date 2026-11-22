const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
})[char]);

export function plainTextToHtml(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push('<p>' + paragraph.map(inlineMarkdown).join('<br>') + '</p>');
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) { flushParagraph(); continue; }
    const heading = trimmed.match(/^(#{1,3})\s+(.+?)\s*#*$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      output.push('<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>');
      continue;
    }

    const listItem = trimmed.match(/^([-*+])\s+(.+)$|^(\d+)[.)]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      const ordered = Boolean(listItem[3]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const current = lines[index].trim().match(/^([-*+])\s+(.+)$|^(\d+)[.)]\s+(.+)$/);
        if (!current || Boolean(current[3]) !== ordered) break;
        items.push('<li>' + inlineMarkdown(current[2] || current[4]) + '</li>');
        index += 1;
      }
      index -= 1;
      output.push('<' + tag + '>' + items.join('') + '</' + tag + '>');
      continue;
    }

    if (/^(?:---+|___+|\*\*\*+)\s*$/.test(trimmed)) {
      flushParagraph();
      output.push('<hr>');
      continue;
    }
    paragraph.push(lines[index]);
  }
  flushParagraph();
  return output.join('');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => '<strong>' + (a || b) + '</strong>')
    .replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (_, a, b) => '<em>' + (a || b) + '</em>');
}

function cleanText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyHeading(text, explicitTag) {
  const value = cleanText(text);
  if (!value) return 'paragraph';
  if (explicitTag === 'H1') return 'heading1';
  if (explicitTag === 'H2' || explicitTag === 'H3') return 'heading2';
  if (/^BAB\s+(?:[IVXLCDM]+|\d+)\b/i.test(value)) return 'heading1';
  if (/^(KATA PENGANTAR|DAFTAR ISI|DAFTAR PUSTAKA|PENDAHULUAN|PENUTUP|LAMPIRAN)\b/i.test(value)) return 'heading1';
  if (/^(?:[A-Z]|\d+(?:\.\d+)*)[.)]\s+\S/.test(value) && value.length < 150) return 'heading2';
  if (value.length < 90 && value === value.toLocaleUpperCase('id-ID') && /[A-Z]/.test(value)) return 'heading1';
  return 'paragraph';
}

function nodeToBlock(node) {
  if (!node) return null;
  if (node.nodeType === 3) {
    const value = cleanText(node.nodeValue);
    return value ? { type: 'paragraph', text: value, html: '<p>' + escapeHtml(value) + '</p>' } : null;
  }
  if (node.nodeType !== 1) return null;
  const tag = node.tagName.toUpperCase();
  if (tag === 'UL' || tag === 'OL') {
    const items = Array.from(node.children).filter((child) => child.tagName === 'LI')
      .map((child) => ({ text: cleanText(child.textContent), html: child.innerHTML }));
    return items.length ? { type: 'list', ordered: tag === 'OL', items, html: node.outerHTML } : null;
  }
  if (tag === 'TABLE') {
    const rows = Array.from(node.querySelectorAll('tr')).map((row) =>
      Array.from(row.children).map((cell) => ({ text: cleanText(cell.textContent), html: cell.innerHTML }))
    );
    return { type: 'table', rows, html: node.outerHTML };
  }
  if (tag === 'IMG') {
    return { type: 'image', src: node.getAttribute('src') || '', alt: node.getAttribute('alt') || '', html: node.outerHTML };
  }
  const text = cleanText(node.textContent);
  if (node.classList && node.classList.contains('toc-row')) return { type: 'tocEntry', text, html: node.outerHTML };
  const type = classifyHeading(text, tag);
  if (!text && !node.querySelector('img')) return null;
  if (node.querySelector('img') && !text) {
    const image = node.querySelector('img');
    return { type: 'image', src: image.getAttribute('src') || '', alt: image.getAttribute('alt') || '', html: image.outerHTML };
  }
  if (type === 'heading1' || type === 'heading2') return { type, text, html: node.outerHTML };
  return { type: 'paragraph', text, html: node.outerHTML };
}

export function parseDocument(source) {
  const value = String(source || '');
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  const parsedSource = looksLikeHtml ? value : plainTextToHtml(value);
  const parsed = new DOMParser().parseFromString('<div id="document-root">' + parsedSource + '</div>', 'text/html');
  const root = parsed.getElementById('document-root');
  root.querySelectorAll('script,style,iframe,object,embed,form,meta,link').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((node) => Array.from(node.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim().toLowerCase();
    if (name.startsWith('on') || (name === 'style' && /url\s*\(|expression\s*\(|behavior\s*:|@import/i.test(attribute.value))) {
      node.removeAttribute(attribute.name);
      return;
    }
    if (name === 'href' && /^(javascript|vbscript|data):/i.test(value)) node.removeAttribute(attribute.name);
    if (name === 'src' && (/^(javascript|vbscript):/i.test(value) || (value.startsWith('data:') && !/^data:image\/(?:png|jpe?g|gif|webp);/i.test(value)))) {
      node.removeAttribute(attribute.name);
    }
  }));
  const html = root.innerHTML;
  const blocks = [];
  function appendNode(node) {
    if (node.nodeType === 1 && ['DIV', 'SECTION', 'ARTICLE'].includes(node.tagName) &&
        Array.from(node.children).some((child) => ['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'TABLE', 'DIV', 'SECTION'].includes(child.tagName))) {
      Array.from(node.childNodes).forEach(appendNode);
      return;
    }
    const block = nodeToBlock(node);
    if (block) blocks.push(block);
    else if (node.nodeType === 1) {
      Array.from(node.childNodes).forEach((child) => {
        const nested = nodeToBlock(child);
        if (nested) blocks.push(nested);
      });
    }
  }
  Array.from(root.childNodes).forEach(appendNode);
  const analysis = analyzeBlocks(blocks);
  if (analysis.hasCover) {
    const frontHeading = blocks.findIndex((block) => block.type === 'heading1' && /^(KATA PENGANTAR|DAFTAR ISI|BAB\s)/i.test(block.text || ''));
    const coverEnd = frontHeading >= 0 ? frontHeading : Math.min(8, blocks.length);
    blocks.forEach((block, index) => { if (index < coverEnd) block.cover = true; });
  }
  return { html, blocks, analysis: analyzeBlocks(blocks) };
}

export function analyzeBlocks(blocks) {
  const textBlocks = blocks.filter((block) => block.text);
  const headingBlocks = textBlocks.filter((block) => block.type === 'heading1' || block.type === 'heading2');
  const hasCover = textBlocks.slice(0, 8).some((block) => /^(MAKALAH|LAPORAN|PROPOSAL)\b/i.test(block.text));
  const hasToc = textBlocks.some((block) => /^(DAFTAR ISI|ISI)\b/i.test(block.text));
  const hasPreface = textBlocks.some((block) => /^KATA PENGANTAR\b/i.test(block.text));
  const hasReferences = textBlocks.some((block) => /^DAFTAR PUSTAKA\b/i.test(block.text));
  const firstBodyChapter = findFirstChapterIndex(blocks);
  const chapters = firstBodyChapter < 0 ? [] : blocks.slice(firstBodyChapter)
    .filter((block) => /^BAB\s+(?:[IVXLCDM]+|\d+)\b/i.test(block.text || ''));
  const wordCount = blocks.reduce((total, block) => {
    const value = block.text || (block.items || []).map((item) => item.text).join(' ') || '';
    return total + (cleanText(value) ? cleanText(value).split(' ').length : 0);
  }, 0);
  return {
    hasCover, hasToc, hasPreface, hasReferences, chapterCount: chapters.length,
    headingCount: headingBlocks.length, paragraphCount: blocks.filter((block) => block.type === 'paragraph').length,
    tableCount: blocks.filter((block) => block.type === 'table').length,
    imageCount: blocks.filter((block) => block.type === 'image').length,
    listCount: blocks.filter((block) => block.type === 'list').length,
    wordCount, charCount: blocks.map((block) => block.text || '').join(' ').length,
    estimatedPages: Math.max(1, Math.ceil(wordCount / 330))
  };
}

export function findFirstChapterIndex(blocks) {
  const chapters = blocks.map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === 'heading1' && /^BAB\s/i.test(block.text || ''));
  if (!chapters.length) return -1;
  const tocIndex = blocks.findIndex((block) => block.type === 'heading1' && /^DAFTAR ISI\b/i.test(block.text || ''));
  if (tocIndex < 0) return chapters[0].index;
  const afterToc = chapters.filter(({ index }) => index > tocIndex);
  for (let index = 1; index < afterToc.length; index += 1) {
    const current = String(afterToc[index].block.text || '').match(/^BAB\s+([IVXLCDM]+|\d+)/i);
    const id = current ? current[1].toUpperCase() : '';
    if (afterToc.slice(0, index).some(({ block }) => {
      const previous = String(block.text || '').match(/^BAB\s+([IVXLCDM]+|\d+)/i);
      return previous && previous[1].toUpperCase() === id;
    })) return afterToc[index].index;
  }
  return afterToc.length ? afterToc[0].index : chapters[0].index;
}

export function insertGeneratedCover(metadata) {
  const authors = metadata.members && metadata.members.length
    ? metadata.members.map((member) => [member.name ? escapeHtml(member.name) : '', member.idNumber ? 'NIM ' + escapeHtml(member.idNumber) : ''].filter(Boolean).join(' — ')).filter(Boolean).join('<br>')
    : escapeHtml(metadata.author || '');
  const rows = [
    metadata.coverImage ? '<p class="cover-logo"><img src="' + metadata.coverImage + '" alt="Logo sampul"></p>' : '',
    '<p class="cover-kicker">MAKALAH</p>',
    '<p class="cover-title">' + escapeHtml(metadata.title || 'Judul Makalah') + '</p>',
    '<p>Disusun untuk memenuhi tugas' + (metadata.course ? ' ' + escapeHtml(metadata.course) : '') + '</p>',
    metadata.teacher ? '<p class="cover-teacher">Dibimbing oleh ' + escapeHtml(metadata.teacher) + '</p>' : '',
    '<p class="cover-byline">Disusun oleh</p>',
    '<p>' + (authors || 'Nama penulis') + '</p>',
    metadata.className ? '<p>' + escapeHtml(metadata.className) + '</p>' : '',
    metadata.program ? '<p>' + escapeHtml(metadata.program) + '</p>' : '',
    metadata.department ? '<p>' + escapeHtml(metadata.department) + '</p>' : '',
    metadata.faculty ? '<p>' + escapeHtml(metadata.faculty) + '</p>' : '',
    metadata.institution ? '<p class="cover-institution">' + escapeHtml(metadata.institution) + '</p>' : '',
    '<p class="cover-date">' + escapeHtml([metadata.city, metadata.year].filter(Boolean).join(', ')) + '</p>'
  ].filter(Boolean);
  return '<section class="generated-cover">' + rows.join('') + '</section>';
}
