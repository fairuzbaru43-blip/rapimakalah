import { BookOpenText, ListTree, ShieldCheck, FileText } from 'lucide-react';

const tabs = [
  { id: 'pages', label: 'Halaman', Icon: FileText },
  { id: 'structure', label: 'Struktur', Icon: ListTree },
  { id: 'rules', label: 'Aturan', Icon: ShieldCheck }
];

export default function PageNavigation({ activeTab, onTab, blocks, settings, pages, page, onPage, onSection }) {
  const headings = blocks.filter((block) => block.type === 'heading1' || block.type === 'heading2');
  const rules = [
    { label: 'Margin halaman', ok: Boolean(settings.rules.margins) },
    { label: 'Font dan spasi isi', ok: Boolean(settings.rules.font && settings.rules.lineSpacing) },
    { label: 'Heading makalah', ok: Boolean(settings.rules.headings && headings.length) },
    { label: 'Nomor halaman', ok: Boolean(settings.rules.pageNumbers && settings.numbering.enabled) },
    { label: 'Daftar pustaka terdeteksi', ok: blocks.some((block) => /DAFTAR PUSTAKA/i.test(block.text || '')) }
  ];
  return (
    <aside className="navigation-pane">
      <div className="navigation-tabs">
        {tabs.map(({ id, label, Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => onTab(id)}><Icon size={14} />{label}</button>)}
      </div>
      {activeTab === 'pages' && <div className="page-list">
        {Array.from({ length: Math.max(1, pages) }, (_, index) => (
          <button className={'page-thumb-row ' + (page === index ? 'active' : '')} key={index} onClick={() => onPage(index)}>
            <span className="thumbnail"><span /><span /><span /><span /></span>
            <span><strong>Halaman {index + 1}</strong><small>{index === 0 ? 'Tampilan hasil' : 'Lanjutkan dokumen'}</small></span>
          </button>
        ))}
      </div>}
      {activeTab === 'structure' && <div className="structure-list">
        {!headings.length && <div className="empty-hint"><BookOpenText size={18} /><p>Heading makalah akan muncul di sini setelah terdeteksi.</p></div>}
        {headings.map((block, index) => <button key={index} className={'structure-item ' + block.type} onClick={() => onSection(block.text)}><span className="structure-dot" />{block.text}</button>)}
      </div>}
      {activeTab === 'rules' && <div className="rule-list">
        {rules.map((rule) => <div className="rule-row" key={rule.label}><span className={'rule-state ' + (rule.ok ? 'ok' : 'warn')}>{rule.ok ? '✓' : '!'}</span><span>{rule.label}</span></div>)}
      </div>}
      <div className="navigation-footer"><span className="mini-dot" /> Semua perubahan disimpan otomatis</div>
    </aside>
  );
}
