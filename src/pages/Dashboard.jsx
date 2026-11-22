import { ArrowRight, Clock3, FileCheck2, FilePlus2, Files, Sparkles } from 'lucide-react';
import DocumentUpload from '../components/DocumentUpload.jsx';

function relativeDate(value) {
  if (!value) return 'Baru saja';
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60000) return 'Baru saja';
  if (elapsed < 3600000) return Math.max(1, Math.floor(elapsed / 60000)) + ' menit lalu';
  if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + ' jam lalu';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Dashboard({ documents, onNew, onUpload, onOpen, onViewAll }) {
  const completed = documents.filter((item) => item.formattedAt).length;
  const pending = documents.length - completed;
  const recent = documents.slice(0, 5);
  return (
    <div className="page-content dashboard-page">
      <section className="welcome-banner">
        <div className="welcome-copy"><span className="eyebrow"><Sparkles size={13} /> RUANG KERJA AKADEMIK</span>
          <h1>Rapikan makalah,<br /><em>siap dikumpulkan.</em></h1>
          <p>Format naskah, periksa strukturnya, lalu unduh sebagai dokumen Word.</p>
          <button className="button button-primary hero-button" onClick={onNew}><FilePlus2 size={17} /> Buat dokumen baru</button>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="art-glow" /><div className="art-sheet"><span /><span /><span /><span /><span /><i>DOCX</i></div><div className="art-check">✓</div></div>
      </section>
      <section className="stats-grid">
        <article className="stat-card"><span className="stat-icon blue"><Files size={18} /></span><div><strong>{documents.length}</strong><small>Total dokumen</small></div><span className="stat-side">Di akun Anda</span></article>
        <article className="stat-card"><span className="stat-icon amber"><Clock3 size={18} /></span><div><strong>{pending}</strong><small>Belum diformat</small></div><span className="stat-side">Siap diproses</span></article>
        <article className="stat-card"><span className="stat-icon green"><FileCheck2 size={18} /></span><div><strong>{completed}</strong><small>Sudah diformat</small></div><span className="stat-side">Bisa diunduh</span></article>
      </section>
      <section className="dashboard-columns">
        <div className="recent-card">
          <div className="section-title-row"><div><h2>Dokumen terbaru</h2><p>Lanjutkan pekerjaan terakhir Anda.</p></div><button className="text-button" onClick={onViewAll}>Lihat semua <ArrowRight size={15} /></button></div>
          {recent.length === 0 ? <div className="empty-documents"><div className="empty-illustration"><Files size={25} /></div><strong>Belum ada dokumen</strong><p>Buat makalah baru atau unggah naskah dari perangkat Anda.</p><div className="empty-actions"><button className="button button-primary" onClick={onNew}><FilePlus2 size={16} /> Buat baru</button><DocumentUpload onFile={onUpload} compact /></div></div>
            : <div className="recent-list">{recent.map((item) => <button className="recent-row" key={item.id} onClick={() => onOpen(item)}>
              <span className="file-badge"><Files size={17} /></span><span className="recent-name"><strong>{item.title || 'Dokumen tanpa judul'}</strong><small>{item.formattedAt ? 'Sudah diformat' : 'Belum diformat'} · {relativeDate(item.updatedAt)}</small></span><ArrowRight size={16} />
            </button>)}</div>}
        </div>
        <div className="quick-card">
          <div className="quick-icon"><FilePlus2 size={19} /></div><h3>Mulai dari naskah Anda</h3><p>Unggah Word atau tempel tulisan panjang. Naskah asli disimpan terpisah dari hasilnya.</p>
          <button className="button button-secondary quick-upload" onClick={onNew}>Buka editor <ArrowRight size={15} /></button>
          <DocumentUpload onFile={onUpload} />
        </div>
      </section>
      <section className="activity-card">
        <div className="section-title-row"><div><h2>Riwayat aktivitas</h2><p>Perubahan terbaru pada dokumen akun Anda.</p></div></div>
        {recent.length === 0 ? <p className="activity-empty">Aktivitas dokumen akan tampil setelah Anda mulai menulis.</p>
          : <div className="activity-list">{recent.slice(0, 4).map((item) => <div className="activity-row" key={item.id}>
            <span className={'activity-dot ' + (item.formattedAt ? 'formatted' : '')} />
            <span><strong>{item.formattedAt ? 'Formatting selesai' : 'Dokumen disimpan'}</strong><small>{item.title || 'Dokumen tanpa judul'}</small></span>
            <time>{relativeDate(item.updatedAt)}</time>
          </div>)}</div>}
      </section>
    </div>
  );
}
