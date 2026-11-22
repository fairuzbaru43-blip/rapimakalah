import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, FileCheck2 } from 'lucide-react';
import { estimatePageCount } from '../services/documentFormatter.js';

const paperSizes = { A4: [794, 1123], A5: [559, 794], Letter: [816, 1056], Legal: [816, 1344], F4: [812, 1247] };

function pageDimensions(settings) {
  const [portraitWidth, portraitHeight] = paperSizes[settings.paper.size] || paperSizes.A4;
  return settings.paper.orientation === 'landscape'
    ? { width: portraitHeight, height: portraitWidth }
    : { width: portraitWidth, height: portraitHeight };
}

function splitPages(blocks, settings, count) {
  const { height: paperHeight } = pageDimensions(settings);
  const top = settings.rules.margins ? settings.paper.top : 2.54;
  const bottom = settings.rules.margins ? settings.paper.bottom : 2.54;
  const size = settings.rules.fontSize ? settings.typography.size : 12;
  const spacing = settings.rules.lineSpacing ? settings.typography.lineSpacing : 1.15;
  const contentLines = Math.max(22, (paperHeight - (top + bottom) * 37.8) /
    Math.max(18, size * 1.6 * spacing));
  const result = [[]];
  let used = 0;
  blocks.forEach((block) => {
    const content = block.text || (block.items || []).map((item) => item.text).join(' ') || '';
    let lines = block.type === 'heading1' ? 3 : block.type === 'heading2' ? 2 : block.type === 'table' ? Math.max(3, (block.rows || []).length * 2) : block.type === 'image' ? 9 : Math.max(1, Math.ceil(content.length / 88)) + 0.7;
    const startsNewPage = block.type === 'heading1' && /^(BAB\s|KATA PENGANTAR|DAFTAR ISI|DAFTAR PUSTAKA)/i.test(block.text || '');
    if (startsNewPage && result[result.length - 1].length) { result.push([]); used = 0; }
    if (used > 0 && used + lines > contentLines) { result.push([]); used = 0; }
    result[result.length - 1].push(block);
    used += lines;
  });
  while (result.length < count) result.push([]);
  return result;
}

function PreviewBlock({ block, settings }) {
  if (block.cover) return <div className={'preview-cover-block ' + (String(block.html || '').includes('cover-title') ? 'title' : '')} dangerouslySetInnerHTML={{ __html: block.html }} />;
  if (block.type === 'image') return <img className="preview-image" src={block.src} alt={block.alt || 'Gambar dokumen'} />;
  if (block.type === 'table') return <div className="preview-table" dangerouslySetInnerHTML={{ __html: block.html }} />;
  if (block.type === 'list') return <div className="preview-list" dangerouslySetInnerHTML={{ __html: block.html }} />;
  if (block.type === 'tocEntry') return <div className="preview-toc-entry" dangerouslySetInnerHTML={{ __html: block.html }} />;
  if (block.type === 'heading1' && settings.rules.headings) return <div className="preview-heading chapter" dangerouslySetInnerHTML={{ __html: block.html }} style={{ textAlign: settings.rules.alignment ? settings.headings.chapterAlignment : 'left', fontSize: settings.headings.chapterSize + 'pt' }} />;
  if (block.type === 'heading2' && settings.rules.headings) return <div className="preview-heading subheading" dangerouslySetInnerHTML={{ __html: block.html }} style={{ fontSize: settings.headings.subheadingSize + 'pt' }} />;
  return <div className="preview-paragraph" style={{
    textIndent: settings.rules.indentation ? settings.typography.indent + 'cm' : '0',
    textAlign: settings.rules.alignment ? settings.typography.alignment : 'left',
    '--preview-paragraph-gap': (settings.rules.paragraphSpacing ? settings.typography.after : 0) + 'pt'
  }} dangerouslySetInnerHTML={{ __html: block.html }} />;
}

export default function DocumentPreview({ blocks, settings, title, currentPage, onPageChange, onPageCount }) {
  const [zoom, setZoom] = useState(77);
  const pageRefs = useRef([]);
  const pages = useMemo(() => {
    const count = estimatePageCount(blocks, settings);
    return splitPages(blocks, settings, count);
  }, [blocks, settings]);
  const reportPageCount = useCallback(() => onPageCount(pages.length), [onPageCount, pages.length]);
  useEffect(() => { reportPageCount(); if (currentPage >= pages.length) onPageChange(pages.length - 1); }, [pages.length, currentPage, onPageChange, reportPageCount]);
  useEffect(() => {
    if (pageRefs.current[currentPage] && pageRefs.current[currentPage].scrollIntoView) {
      pageRefs.current[currentPage].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);
  const marginStyle = {
    paddingTop: (settings.rules.margins ? settings.paper.top : 2.54) + 'cm', paddingBottom: (settings.rules.margins ? settings.paper.bottom : 2.54) + 'cm',
    paddingLeft: (settings.rules.margins ? settings.paper.left : 2.54) + 'cm', paddingRight: (settings.rules.margins ? settings.paper.right : 2.54) + 'cm',
    fontFamily: settings.rules.font ? settings.typography.font : 'Times New Roman',
    fontSize: (settings.rules.fontSize ? settings.typography.size : 12) + 'pt',
    lineHeight: settings.rules.lineSpacing ? settings.typography.lineSpacing : 1.15,
    textAlign: settings.rules.alignment ? settings.typography.alignment : 'left',
    width: pageDimensions(settings).width + 'px',
    minHeight: pageDimensions(settings).height + 'px'
  };
  const page = Math.min(Math.max(0, currentPage), pages.length - 1);
  const bodyPage = pages.findIndex((items) => items.some((block) => block.type === 'heading1' && /^BAB\s/i.test(block.text || '')));
  return (
    <section className="preview-pane">
      <div className="preview-toolbar">
        <div className="preview-title"><FileCheck2 size={16} /><strong>Pratinjau hasil</strong><span className="preview-tag">DOCX</span></div>
        <div className="preview-controls">
          <button className="icon-button" title="Perkecil" onClick={() => setZoom((value) => Math.max(45, value - 5))}><Minus size={15} /></button>
          <button className="zoom-value" title="Atur ulang zoom" onClick={() => setZoom(77)}><RotateCcw size={12} /> {zoom}%</button>
          <button className="icon-button" title="Perbesar" onClick={() => setZoom((value) => Math.min(120, value + 5))}><Plus size={15} /></button>
          <span className="toolbar-divider" />
          <button className="icon-button" disabled={page <= 0} title="Halaman sebelumnya" onClick={() => onPageChange(Math.max(0, page - 1))}><ChevronLeft size={17} /></button>
          <span className="page-counter">{page + 1} / {pages.length}</span>
          <button className="icon-button" disabled={page >= pages.length - 1} title="Halaman berikutnya" onClick={() => onPageChange(Math.min(pages.length - 1, page + 1))}><ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="preview-scroll">
        <div className="paper-zoom" style={{ transform: 'scale(' + zoom / 100 + ')' }}>
          {pages.map((items, pageIndex) => <article ref={(element) => { pageRefs.current[pageIndex] = element; }} className={'preview-page ' + (pageIndex === page ? 'current' : '')} style={marginStyle} key={pageIndex}>
            {pageIndex === 0 && <div className="preview-doc-title">{title || 'Dokumen tanpa judul'}</div>}
            <div className="preview-content">
              {items.map((block, index) => <PreviewBlock block={block} settings={settings} key={pageIndex + '-' + index} />)}
            </div>
            {settings.rules.pageNumbers && settings.numbering.enabled &&
              !(settings.numbering.coverWithoutNumber && items.some((block) => block.cover) && pageIndex === 0) &&
              <div className={'preview-page-number ' + settings.numbering.position}>
                {bodyPage >= 0 && pageIndex >= bodyPage
                  ? pageIndex - bodyPage + 1
                  : settings.numbering.frontRoman
                    ? roman(pages.slice(0, pageIndex + 1).filter((frontPage, index) =>
                        !(settings.numbering.coverWithoutNumber && index === 0 && frontPage.some((block) => block.cover))
                      ).length)
                    : pages.slice(0, pageIndex + 1).filter((frontPage, index) =>
                        !(settings.numbering.coverWithoutNumber && index === 0 && frontPage.some((block) => block.cover))
                      ).length}
              </div>}
          </article>)}
        </div>
      </div>
      <div className="preview-bottom"><span>{settings.paper.size || 'A4'} · {settings.paper.orientation === 'portrait' ? 'Potret' : 'Lanskap'}</span><span>{pages.length} halaman diperkirakan</span></div>
    </section>
  );
}

function roman(number) {
  const values = [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];
  let remainder = number;
  return values.reduce((result, [value, glyph]) => {
    while (remainder >= value) { result += glyph; remainder -= value; }
    return result;
  }, '');
}
