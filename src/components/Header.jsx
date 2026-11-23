import { BookOpen, Download, FileUp, MoreHorizontal, Check, LoaderCircle, AlertCircle, Printer } from 'lucide-react';

export default function Header({ page, document, status, onUpload, onDownload, onPdf, onRename }) {
  const labels = { dashboard: 'Ringkasan', documents: 'Dokumen', workspace: 'Editor makalah', templates: 'Template', settings: 'Pengaturan' };
  return (
    <header className="topbar" data-page={page}>
      <div className="mobile-header-brand">
        <span className="brand-mark"><BookOpen size={18} /></span>
        <span><strong>RapiMakalah</strong><small>{labels[page] || 'Ruang kerja'}</small></span>
      </div>
      <div className="breadcrumbs"><span>RapiMakalah</span><i>/</i><strong>{labels[page] || 'Ruang kerja'}</strong></div>
      <div className="topbar-actions">
        {document && page === 'workspace' && <span className={'save-indicator ' + (status === 'error' ? 'error' : '')}>
          {status === 'saving' ? <LoaderCircle className="spin" size={14} /> : status === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
          {status === 'saving' ? 'Menyimpan' : status === 'error' ? 'Gagal menyimpan' : 'Tersimpan'}
        </span>}
        <button className="button button-secondary upload-header-button" aria-label="Unggah dokumen" title="Unggah dokumen" onClick={onUpload}><FileUp size={17} /><span>Unggah</span></button>
        {document && page === 'workspace' && <button className="button button-secondary pdf-button" aria-label="Simpan sebagai PDF" title="Simpan sebagai PDF" onClick={onPdf}><Printer size={16} /><span>Simpan PDF</span></button>}
        {document && page === 'workspace' && <button className="button button-primary docx-button" aria-label="Unduh DOCX" title="Unduh DOCX" onClick={onDownload}><Download size={16} /><span>Unduh DOCX</span></button>}
        {document && page === 'workspace' && <button className="icon-button more-button" aria-label="Opsi dokumen" title="Opsi dokumen" onClick={() => onRename()}><MoreHorizontal size={18} /></button>}
      </div>
    </header>
  );
}
