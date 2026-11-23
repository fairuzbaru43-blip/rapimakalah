import { useState } from 'react';
import { Eye, ListTree, PenLine, SearchCheck, SlidersHorizontal } from 'lucide-react';
import PageNavigation from './PageNavigation.jsx';
import DocumentEditor from './DocumentEditor.jsx';
import DocumentPreview from './DocumentPreview.jsx';

export default function Workspace({
  document, settings, sourceHtml, onSourceChange, onImage, analysis, onSection,
  onCheck, previewPage, onPreviewPage, onPageCount, issues, mode, onMode, onTogglePanel
}) {
  const [leftTab, setLeftTab] = useState('pages');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const blocks = analysis.blocks;
  return (
    <>
      <PageNavigation activeTab={leftTab} onTab={(tab) => {
        setLeftTab(tab);
        if (tab === 'rules') setCheckOpen(true);
      }} mobileOpen={outlineOpen} blocks={blocks} settings={settings} pages={analysis.pageCount} page={previewPage} onPage={onPreviewPage} onSection={onSection} />
      <section className="center-pane">
        <div className="mobile-workspace-actions">
          <button aria-expanded={outlineOpen} onClick={() => setOutlineOpen((open) => !open)}><ListTree size={17} />{outlineOpen ? 'Sembunyikan struktur' : 'Struktur & halaman'}</button>
          <button onClick={onTogglePanel}><SlidersHorizontal size={17} />Atur dokumen</button>
        </div>
        <div className="center-tabs">
          <div className="mode-tabs">
            <button className={mode === 'write' ? 'active' : ''} onClick={() => onMode('write')}><PenLine size={15} />Tulis naskah</button>
            <button className={mode === 'preview' ? 'active' : ''} onClick={() => onMode('preview')}><Eye size={15} />Pratinjau hasil</button>
          </div>
          <button className="check-shortcut" onClick={() => { setCheckOpen((value) => !value); onCheck(); }}><SearchCheck size={15} />{issues.length ? issues.length + ' temuan' : 'Periksa dokumen'}</button>
        </div>
        {mode === 'write'
          ? <DocumentEditor html={sourceHtml} onChange={onSourceChange} onImage={onImage}
            wordCount={analysis.wordCount} charCount={analysis.charCount} paragraphCount={analysis.paragraphCount} />
          : <DocumentPreview blocks={analysis.blocks} settings={settings} title={document.title}
            currentPage={previewPage} onPageChange={onPreviewPage} onPageCount={onPageCount} />}
      </section>
      {checkOpen && <div className="inline-check-drawer">
        <button className="drawer-close" onClick={() => setCheckOpen(false)}>Tutup</button>
        <strong>{issues.length ? issues.length + ' hal untuk ditinjau' : 'Pemeriksaan selesai'}</strong>
        {issues.slice(0, 3).map((issue) => <p key={issue.id}>{issue.title}</p>)}
      </div>}
    </>
  );
}
