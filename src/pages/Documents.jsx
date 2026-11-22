import { Clock3, Copy, Download, FileCheck2, Files, FileText, Pencil, Trash2 } from 'lucide-react';

export default function Documents({ documents, onOpen, onRename, onDelete, onDuplicate, onDownload, onHistory }) {
  return (
    <div className="page-content">
      <div className="page-heading"><div><span className="eyebrow">ARSIP AKUN</span><h1>Dokumen</h1><p>Kelola naskah asli dan hasil formatting Anda.</p></div><span className="document-total">{documents.length} dokumen</span></div>
      {documents.length === 0 ? <div className="empty-card"><Files size={26} /><h2>Belum ada dokumen tersimpan</h2><p>Buat dokumen baru atau unggah file DOCX, TXT, maupun HTML.</p></div>
        : <div className="documents-table">
          <div className="table-head"><span>Nama dokumen</span><span>Status</span><span>Terakhir diedit</span><span>Aksi</span></div>
          {documents.map((item) => <div className="document-row" key={item.id}>
            <button className="document-main" onClick={() => onOpen(item)}><span className="file-badge"><FileText size={17} /></span><span><strong>{item.title || 'Dokumen tanpa judul'}</strong><small>{item.originalName || 'Dokumen RapiMakalah'}</small></span></button>
            <span className={'status-pill ' + (item.formattedAt ? 'done' : 'pending')}><i />{item.formattedAt ? 'Sudah diformat' : 'Belum diformat'}</span>
            <span className="document-date">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
            <div className="row-actions">
              <button className="icon-button" title="Unduh" onClick={() => onDownload(item, 'result')}><Download size={15} /></button>
              <button className="icon-button" title="Riwayat versi" onClick={() => onHistory(item)}><Clock3 size={15} /></button>
              <button className="icon-button" title="Ganti nama" onClick={() => onRename(item)}><Pencil size={15} /></button>
              <button className="icon-button" title="Duplikasi" onClick={() => onDuplicate(item)}><Copy size={15} /></button>
              <button className="icon-button danger-icon" title="Hapus" onClick={() => onDelete(item)}><Trash2 size={15} /></button>
            </div>
          </div>)}
        </div>}
    </div>
  );
}
