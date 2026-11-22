import { Download, FileUp, MoreHorizontal, Check, LoaderCircle, AlertCircle, Printer } from 'lucide-react';

export default function Header({ page, document, status, onUpload, onDownload, onPdf, onRename }) {
  const labels = { dashboard: 'Ringkasan', documents: 'Dokumen', workspace: 'Editor makalah', templates: 'Template', settings: 'Pengaturan' };
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>RapiMakalah</span><i>/</i><strong>{labels[page] || 'Ruang kerja'}</strong></div>
      <div className="topbar-actions">
        {document && page === 'workspace' && <span className={'save-indicator ' + (status === 'error' ? 'error' : '')}>
          {status === 'saving' ? <LoaderCircle className="spin" size={14} /> : status === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
          {status === 'saving' ? 'Menyimpan' : status === 'error' ? 'Gagal menyimpan' : 'Tersimpan'}
        </span>}
        <button className="button button-secondary" onClick={onUpload}><FileUp size={16} /><span>Unggah</span></button>
        {document && page === 'workspace' && <button className="button button-secondary pdf-button" onClick={onPdf}><Printer size={15} /><span>Simpan PDF</span></button>}
        {document && page === 'workspace' && <button className="button button-primary" onClick={onDownload}><Download size={16} /><span>Unduh DOCX</span></button>}
        {document && page === 'workspace' && <button className="icon-button more-button" title="Opsi dokumen" onClick={() => onRename()}><MoreHorizontal size={18} /></button>}
      </div>
    </header>
  );
}
