import { AlertCircle, CheckCircle2, CircleHelp, ShieldAlert, Wrench } from 'lucide-react';

export function inspectDocument(blocks, settings, metadata, sourceHtml) {
  const text = blocks.map((block) => block.text || '').join('\n');
  const checks = [];
  const add = (id, title, severity, location, explanation, recommendation) => checks.push({ id, title, severity, location, explanation, recommendation });
  const chapters = (text.match(/^BAB\s+(?:[IVXLCDM]+|\d+)\b/gim) || []).length;
  const headings = blocks.filter((block) => block.type === 'heading1' || block.type === 'heading2').length;
  if (!headings) add('headings', 'Heading belum terdeteksi', 'warning', 'Seluruh dokumen', 'Belum ada judul bagian yang dikenali sebagai heading.', 'Pilih judul bagian di editor lalu gunakan gaya Judul atau Subjudul.');
  if (!chapters) add('chapters', 'Judul BAB belum ditemukan', 'warning', 'Struktur dokumen', 'Parser tidak menemukan pola seperti “BAB I” atau “BAB 1”.', 'Periksa penulisan judul BAB di naskah.');
  if (!/DAFTAR PUSTAKA/i.test(text)) add('references', 'Daftar pustaka belum terdeteksi', 'warning', 'Bagian akhir', 'Bagian referensi belum ditemukan. Kelengkapan sumber tetap perlu diperiksa penulis.', 'Tambahkan bagian daftar pustaka pada naskah asli.');
  if (!metadata.title.trim()) add('title', 'Judul dokumen kosong', 'warning', 'Data dokumen', 'Nama file hasil unduhan memerlukan judul.', 'Isi judul pada panel data dokumen.');
  if (!settings.numbering.enabled || !settings.rules.pageNumbers) add('numbering', 'Penomoran halaman nonaktif', 'info', 'Seluruh halaman', 'Dokumen akan diekspor tanpa nomor halaman.', 'Aktifkan aturan penomoran jika format pedoman memerlukannya.');
  const html = String(sourceHtml || '');
  const blankRuns = (html.match(/(?:<p[^>]*>\s*(?:&nbsp;|<br\s*\/?>|\s)*<\/p>\s*){3,}/gi) || []).length;
  if (blankRuns) add('blank-lines', 'Paragraf kosong berulang', 'warning', 'Naskah asli', 'Ada beberapa baris kosong berurutan yang dapat membuat jarak halaman tidak konsisten.', 'Hapus baris kosong berlebih di editor.');
  const fonts = Array.from(new Set(Array.from(html.matchAll(/font-family\s*:\s*([^;"']+)/gi), (match) => match[1].trim().toLowerCase())));
  if (fonts.length > 1) add('fonts', 'Font sumber bervariasi', 'warning', 'Naskah asli', 'Ditemukan lebih dari satu jenis font tertanam pada sumber.', 'Terapkan satu font melalui aturan tipografi.');
  const sizes = Array.from(new Set(Array.from(html.matchAll(/font-size\s*:\s*([^;"']+)/gi), (match) => match[1].trim().toLowerCase())));
  if (sizes.length > 1) add('font-sizes', 'Ukuran teks sumber bervariasi', 'info', 'Naskah asli', 'Ukuran teks tertanam berbeda-beda.', 'Pilih aturan ukuran teks lalu terapkan formatting.');
  if (chapters && chapters < 3) add('structure', 'Struktur BAB terbatas', 'info', 'Struktur dokumen', 'Kurang dari tiga judul BAB ditemukan. Sesuaikan dengan pedoman yang digunakan.', 'Tinjau kembali susunan bagian makalah.');
  return checks;
}

export default function InspectionPanel({ issues, onFix, onRecheck }) {
  const warnings = issues.filter((issue) => issue.severity !== 'info').length;
  return (
    <aside className="formatting-pane inspection-pane">
      <div className="panel-heading"><div><h2>Pemeriksaan dokumen</h2><p>Temuan dari isi dan aturan aktif.</p></div><span className={'issue-count ' + (warnings ? 'has-warning' : '')}>{issues.length} temuan</span></div>
      <div className="inspection-summary"><ShieldAlert size={18} /><span>{warnings ? 'Periksa poin yang ditandai sebelum mengunduh.' : 'Tidak ada masalah penting yang terdeteksi.'}</span></div>
      <div className="issue-list">
        {issues.length === 0 && <div className="all-clear"><CheckCircle2 size={30} /><strong>Dokumen terlihat rapi</strong><p>Pemeriksaan struktur dan aturan dasar selesai.</p></div>}
        {issues.map((issue) => {
          const Icon = issue.severity === 'info' ? CircleHelp : AlertCircle;
          return <article className={'issue-card ' + issue.severity} key={issue.id}>
            <div className="issue-title"><Icon size={17} /><strong>{issue.title}</strong></div>
            <span className="issue-location">{issue.location} · {issue.severity === 'info' ? 'Info' : 'Perlu ditinjau'}</span>
            <p>{issue.explanation}</p>
            <div className="issue-recommendation"><b>Saran</b><span>{issue.recommendation}</span></div>
            <button className="issue-fix" onClick={() => onFix(issue)}><Wrench size={14} />{issue.id === 'numbering' || issue.id === 'fonts' || issue.id === 'font-sizes' ? 'Buka pengaturan' : 'Tinjau naskah'}</button>
          </article>;
        })}
      </div>
      <div className="inspection-footer"><button className="secondary-wide" onClick={onRecheck}>Jalankan pemeriksaan ulang</button></div>
    </aside>
  );
}
